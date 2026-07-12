from app.models.enums import RecommendationType
from app.services.recommendations import SessionPerformance, SetPerformance, decide_progression


def test_recommends_upper_body_increase_when_top_range_and_low_rpe() -> None:
    decision = decide_progression(
        [SessionPerformance([SetPerformance(80, 10, 8), SetPerformance(80, 10, 8.5)])],
        target_reps_min=8,
        target_reps_max=10,
        primary_muscle_group="chest",
        movement_pattern="horizontal press",
    )
    assert decision.recommendation_type == RecommendationType.increase_weight
    assert decision.recommended_weight_kg == 82.5


def test_recommends_lower_body_compound_increase() -> None:
    decision = decide_progression(
        [SessionPerformance([SetPerformance(120, 8, 8)])],
        target_reps_min=6,
        target_reps_max=8,
        primary_muscle_group="quadriceps",
        movement_pattern="squat",
    )
    assert decision.recommendation_type == RecommendationType.increase_weight
    assert decision.recommended_weight_kg == 125


def test_recommends_reduction_after_two_low_rep_sessions() -> None:
    decision = decide_progression(
        [
            SessionPerformance([SetPerformance(100, 4, 9), SetPerformance(100, 5, 9)]),
            SessionPerformance([SetPerformance(100, 5, 9), SetPerformance(100, 5, 9)]),
        ],
        target_reps_min=8,
        target_reps_max=12,
        primary_muscle_group="back",
        movement_pattern="horizontal pull",
    )
    assert decision.recommendation_type == RecommendationType.reduce_weight
    assert decision.recommended_weight_kg == 95


def test_recommends_plateau_after_three_flat_sessions() -> None:
    decision = decide_progression(
        [
            SessionPerformance([SetPerformance(60, 8, 9)]),
            SessionPerformance([SetPerformance(60, 8, 9)]),
            SessionPerformance([SetPerformance(60, 8, 9)]),
        ],
        target_reps_min=8,
        target_reps_max=12,
        primary_muscle_group="biceps",
        movement_pattern="elbow flexion",
    )
    assert decision.recommendation_type == RecommendationType.plateau


def test_recommends_maintain_otherwise() -> None:
    decision = decide_progression(
        [SessionPerformance([SetPerformance(80, 8, 9), SetPerformance(80, 7, 9)])],
        target_reps_min=8,
        target_reps_max=10,
        primary_muscle_group="chest",
        movement_pattern="horizontal press",
    )
    assert decision.recommendation_type == RecommendationType.maintain
