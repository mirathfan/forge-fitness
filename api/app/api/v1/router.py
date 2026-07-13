from fastapi import APIRouter

from app.api.v1.routes import (
    auth,
    bodyweight,
    exercise_analytics,
    exercises,
    profiles,
    recommendations,
    templates,
    workout_sessions,
)

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(profiles.router, prefix="/profiles", tags=["profiles"])
api_router.include_router(bodyweight.router, prefix="/bodyweight-entries", tags=["bodyweight entries"])
api_router.include_router(exercise_analytics.router, prefix="/exercise-analytics", tags=["exercise analytics"])
api_router.include_router(exercises.router, prefix="/exercises", tags=["exercises"])
api_router.include_router(templates.router, prefix="/workout-templates", tags=["workout templates"])
api_router.include_router(workout_sessions.router, prefix="/workout-sessions", tags=["workout sessions"])
api_router.include_router(recommendations.router, prefix="/recommendations", tags=["recommendations"])
