from enum import StrEnum


class WeightUnit(StrEnum):
    kg = "kg"
    lb = "lb"


class FitnessGoal(StrEnum):
    lose_weight = "lose_weight"
    maintain = "maintain"
    gain_muscle = "gain_muscle"
    improve_strength = "improve_strength"


class ExperienceLevel(StrEnum):
    beginner = "beginner"
    intermediate = "intermediate"
    advanced = "advanced"


class WorkoutStatus(StrEnum):
    active = "active"
    completed = "completed"
    abandoned = "abandoned"


class SetType(StrEnum):
    warmup = "warmup"
    working = "working"
    dropset = "dropset"
    failure = "failure"


class RecommendationType(StrEnum):
    increase_weight = "increase_weight"
    reduce_weight = "reduce_weight"
    plateau = "plateau"
    maintain = "maintain"
