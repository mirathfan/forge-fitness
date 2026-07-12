from dataclasses import dataclass
from uuid import UUID

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.models.enums import RecommendationType, SetType, WorkoutStatus
from app.models.recommendation import ProgressionRecommendation
from app.models.template import WorkoutTemplateExercise
from app.models.user import User
from app.models.workout import ExerciseSet, WorkoutSession, WorkoutSessionExercise
from app.repositories.recommendations import RecommendationRepository
from app.services.errors import NotFoundError


@dataclass(frozen=True)
class SetPerformance:
    weight_kg: float
    repetitions: int
    rpe: float | None


@dataclass(frozen=True)
class SessionPerformance:
    sets: list[SetPerformance]


@dataclass(frozen=True)
class RecommendationDecision:
    recommendation_type: RecommendationType
    current_weight_kg: float
    recommended_weight_kg: float | None
    explanation: str


def round_to_increment(value: float, increment: float = 0.5) -> float:
    return round(value / increment) * increment


def is_lower_body_compound(primary_muscle_group: str, movement_pattern: str) -> bool:
    lower_groups = {"quadriceps", "hamstrings", "glutes"}
    compound_patterns = {"squat", "hinge", "lunge", "press", "deadlift"}
    primary = primary_muscle_group.lower()
    movement = movement_pattern.lower()
    return primary in lower_groups and any(pattern in movement for pattern in compound_patterns)


def decide_progression(
    performances: list[SessionPerformance],
    target_reps_min: int,
    target_reps_max: int,
    primary_muscle_group: str,
    movement_pattern: str,
) -> RecommendationDecision:
    current_sets = performances[0].sets if performances else []
    working_sets = [set_ for set_ in current_sets if set_.weight_kg >= 0]
    if not working_sets:
        return RecommendationDecision(
            recommendation_type=RecommendationType.maintain,
            current_weight_kg=0,
            recommended_weight_kg=None,
            explanation="No completed working sets were available, so keep the same load next time.",
        )

    current_weight = max(set_.weight_kg for set_ in working_sets)
    avg_rpe_values = [set_.rpe for set_ in working_sets if set_.rpe is not None]
    avg_rpe = sum(avg_rpe_values) / len(avg_rpe_values) if avg_rpe_values else 8.0

    if all(set_.repetitions >= target_reps_max for set_ in working_sets) and avg_rpe <= 8.5:
        increase = 5.0 if is_lower_body_compound(primary_muscle_group, movement_pattern) else 2.5
        recommended = round_to_increment(current_weight + increase)
        return RecommendationDecision(
            recommendation_type=RecommendationType.increase_weight,
            current_weight_kg=current_weight,
            recommended_weight_kg=recommended,
            explanation=(
                f"All working sets met the top of the {target_reps_min}-{target_reps_max} rep range "
                f"with average RPE {avg_rpe:.1f}; increase by about {increase:g} kg."
            ),
        )

    if len(performances) >= 2:
        latest_two = performances[:2]
        below_minimum_twice = all(
            session.sets and (sum(set_.repetitions for set_ in session.sets) / len(session.sets)) < target_reps_min
            for session in latest_two
        )
        if below_minimum_twice:
            recommended = round_to_increment(current_weight * 0.95)
            return RecommendationDecision(
                recommendation_type=RecommendationType.reduce_weight,
                current_weight_kg=current_weight,
                recommended_weight_kg=recommended,
                explanation=(
                    f"Average reps were below {target_reps_min} for two completed sessions; "
                    "reduce the load by about 5% and rebuild clean reps."
                ),
            )

    if len(performances) >= 3:
        top_scores = []
        for session in performances[:3]:
            if session.sets:
                top_scores.append(max(set_.weight_kg * (1 + set_.repetitions / 30) for set_ in session.sets))
        if len(top_scores) == 3 and max(top_scores) <= min(top_scores) * 1.01:
            return RecommendationDecision(
                recommendation_type=RecommendationType.plateau,
                current_weight_kg=current_weight,
                recommended_weight_kg=None,
                explanation=(
                    "Top-set performance has stayed within 1% across three sessions; "
                    "consider adding a deload, exercise variation, or extra recovery."
                ),
            )

    return RecommendationDecision(
        recommendation_type=RecommendationType.maintain,
        current_weight_kg=current_weight,
        recommended_weight_kg=current_weight,
        explanation=(
            f"Keep {current_weight:g} kg and aim to add reps toward the "
            f"{target_reps_min}-{target_reps_max} target range with solid execution."
        ),
    )


class RecommendationService:
    def __init__(self, db: Session):
        self.db = db
        self.recommendations = RecommendationRepository(db)

    def list_for_user(self, user: User) -> list[ProgressionRecommendation]:
        return self.recommendations.list_for_user(user.id)

    def get(self, user: User, recommendation_id: UUID) -> ProgressionRecommendation:
        recommendation = self.recommendations.get_for_user(recommendation_id, user.id)
        if recommendation is None:
            raise NotFoundError("Recommendation not found")
        return recommendation

    def generate_for_session(self, session: WorkoutSession) -> list[ProgressionRecommendation]:
        self.db.execute(
            delete(ProgressionRecommendation).where(
                ProgressionRecommendation.source_workout_session_id == session.id,
                ProgressionRecommendation.user_id == session.user_id,
            )
        )
        generated: list[ProgressionRecommendation] = []
        for session_exercise in session.exercises:
            performances = self._recent_performances(session.user_id, session_exercise.exercise_id)
            target_min, target_max = self._target_range(session, session_exercise.exercise_id)
            decision = decide_progression(
                performances,
                target_min,
                target_max,
                session_exercise.exercise.primary_muscle_group,
                session_exercise.exercise.movement_pattern,
            )
            recommendation = ProgressionRecommendation(
                user_id=session.user_id,
                exercise_id=session_exercise.exercise_id,
                source_workout_session_id=session.id,
                recommendation_type=decision.recommendation_type,
                current_weight_kg=decision.current_weight_kg,
                recommended_weight_kg=decision.recommended_weight_kg,
                explanation=decision.explanation,
            )
            self.db.add(recommendation)
            generated.append(recommendation)
        self.db.flush()
        return generated

    def _target_range(self, session: WorkoutSession, exercise_id: UUID) -> tuple[int, int]:
        if session.workout_template_id is None:
            return 8, 12
        template_exercise = self.db.scalar(
            select(WorkoutTemplateExercise).where(
                WorkoutTemplateExercise.workout_template_id == session.workout_template_id,
                WorkoutTemplateExercise.exercise_id == exercise_id,
            )
        )
        if template_exercise is None:
            return 8, 12
        return template_exercise.target_reps_min, template_exercise.target_reps_max

    def _recent_performances(self, user_id: UUID, exercise_id: UUID) -> list[SessionPerformance]:
        rows = list(
            self.db.execute(
                select(WorkoutSession.id, ExerciseSet)
                .join(WorkoutSessionExercise, WorkoutSessionExercise.workout_session_id == WorkoutSession.id)
                .join(ExerciseSet, ExerciseSet.workout_session_exercise_id == WorkoutSessionExercise.id)
                .where(
                    WorkoutSession.user_id == user_id,
                    WorkoutSession.status == WorkoutStatus.completed,
                    WorkoutSessionExercise.exercise_id == exercise_id,
                    ExerciseSet.is_completed.is_(True),
                    ExerciseSet.set_type == SetType.working,
                )
                .order_by(WorkoutSession.completed_at.desc(), ExerciseSet.set_number.asc())
            )
        )
        grouped: dict[UUID, list[SetPerformance]] = {}
        for session_id, set_ in rows:
            grouped.setdefault(session_id, []).append(
                SetPerformance(float(set_.weight_kg), set_.repetitions, float(set_.rpe) if set_.rpe else None)
            )
        return [SessionPerformance(sets=sets) for sets in grouped.values()]
