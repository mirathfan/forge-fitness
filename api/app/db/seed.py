from sqlalchemy import select

from app.db.session import SessionLocal
from app.models import Exercise

EXERCISES = [
    {
        "name": "Barbell Bench Press",
        "primary_muscle_group": "chest",
        "secondary_muscle_groups": ["triceps", "shoulders"],
        "equipment": "barbell",
        "movement_pattern": "horizontal press",
        "instructions": "Lower the bar under control to the chest, then press to full lockout.",
    },
    {
        "name": "Incline Dumbbell Press",
        "primary_muscle_group": "chest",
        "secondary_muscle_groups": ["shoulders", "triceps"],
        "equipment": "dumbbell",
        "movement_pattern": "incline press",
        "instructions": "Press dumbbells from upper chest height while keeping shoulder blades set.",
    },
    {
        "name": "Cable Fly",
        "primary_muscle_group": "chest",
        "secondary_muscle_groups": ["shoulders"],
        "equipment": "cable",
        "movement_pattern": "fly",
        "instructions": "Sweep the handles together with a slight elbow bend and controlled stretch.",
    },
    {
        "name": "Push-Up",
        "primary_muscle_group": "chest",
        "secondary_muscle_groups": ["triceps", "core"],
        "equipment": "bodyweight",
        "movement_pattern": "horizontal press",
        "instructions": "Keep a straight line from shoulders to ankles and press through the floor.",
    },
    {
        "name": "Pull-Up",
        "primary_muscle_group": "back",
        "secondary_muscle_groups": ["biceps"],
        "equipment": "bodyweight",
        "movement_pattern": "vertical pull",
        "instructions": "Pull until the chin clears the bar, then lower under control.",
    },
    {
        "name": "Lat Pulldown",
        "primary_muscle_group": "back",
        "secondary_muscle_groups": ["biceps"],
        "equipment": "machine",
        "movement_pattern": "vertical pull",
        "instructions": "Drive elbows down toward the ribs without leaning excessively.",
    },
    {
        "name": "Barbell Row",
        "primary_muscle_group": "back",
        "secondary_muscle_groups": ["biceps", "hamstrings"],
        "equipment": "barbell",
        "movement_pattern": "horizontal pull",
        "instructions": "Hinge at the hips and row the bar toward the lower ribs.",
    },
    {
        "name": "Seated Cable Row",
        "primary_muscle_group": "back",
        "secondary_muscle_groups": ["biceps"],
        "equipment": "cable",
        "movement_pattern": "horizontal pull",
        "instructions": "Pull the handle to the torso while keeping the chest tall.",
    },
    {
        "name": "Single-Arm Dumbbell Row",
        "primary_muscle_group": "back",
        "secondary_muscle_groups": ["biceps"],
        "equipment": "dumbbell",
        "movement_pattern": "horizontal pull",
        "instructions": "Row the dumbbell toward the hip with a stable torso.",
    },
    {
        "name": "Overhead Press",
        "primary_muscle_group": "shoulders",
        "secondary_muscle_groups": ["triceps", "core"],
        "equipment": "barbell",
        "movement_pattern": "vertical press",
        "instructions": "Press the bar overhead from shoulder height while bracing the trunk.",
    },
    {
        "name": "Lateral Raise",
        "primary_muscle_group": "shoulders",
        "secondary_muscle_groups": [],
        "equipment": "dumbbell",
        "movement_pattern": "raise",
        "instructions": "Raise dumbbells to shoulder height with controlled tempo.",
    },
    {
        "name": "Rear Delt Fly",
        "primary_muscle_group": "shoulders",
        "secondary_muscle_groups": ["back"],
        "equipment": "dumbbell",
        "movement_pattern": "fly",
        "instructions": "Open the arms wide while keeping tension on the rear delts.",
    },
    {
        "name": "Barbell Squat",
        "primary_muscle_group": "quadriceps",
        "secondary_muscle_groups": ["glutes", "core"],
        "equipment": "barbell",
        "movement_pattern": "squat",
        "instructions": "Descend with control, keep the torso braced, and drive through the floor.",
    },
    {
        "name": "Front Squat",
        "primary_muscle_group": "quadriceps",
        "secondary_muscle_groups": ["glutes", "core"],
        "equipment": "barbell",
        "movement_pattern": "squat",
        "instructions": "Keep elbows high and torso upright while squatting through full range.",
    },
    {
        "name": "Leg Press",
        "primary_muscle_group": "quadriceps",
        "secondary_muscle_groups": ["glutes", "hamstrings"],
        "equipment": "machine",
        "movement_pattern": "press",
        "instructions": "Lower the sled under control and press without locking knees aggressively.",
    },
    {
        "name": "Leg Extension",
        "primary_muscle_group": "quadriceps",
        "secondary_muscle_groups": [],
        "equipment": "machine",
        "movement_pattern": "knee extension",
        "instructions": "Extend the knees fully and control the lowering phase.",
    },
    {
        "name": "Romanian Deadlift",
        "primary_muscle_group": "hamstrings",
        "secondary_muscle_groups": ["glutes", "back"],
        "equipment": "barbell",
        "movement_pattern": "hinge",
        "instructions": "Hinge at the hips with a neutral spine and feel the hamstrings load.",
    },
    {
        "name": "Leg Curl",
        "primary_muscle_group": "hamstrings",
        "secondary_muscle_groups": [],
        "equipment": "machine",
        "movement_pattern": "knee flexion",
        "instructions": "Curl through a full range and pause briefly at peak contraction.",
    },
    {
        "name": "Good Morning",
        "primary_muscle_group": "hamstrings",
        "secondary_muscle_groups": ["glutes", "back"],
        "equipment": "barbell",
        "movement_pattern": "hinge",
        "instructions": "Hinge with soft knees and a rigid torso, then extend hips to stand.",
    },
    {
        "name": "Hip Thrust",
        "primary_muscle_group": "glutes",
        "secondary_muscle_groups": ["hamstrings"],
        "equipment": "barbell",
        "movement_pattern": "hinge",
        "instructions": "Drive hips up to full extension and pause with ribs down.",
    },
    {
        "name": "Walking Lunge",
        "primary_muscle_group": "glutes",
        "secondary_muscle_groups": ["quadriceps", "hamstrings"],
        "equipment": "dumbbell",
        "movement_pattern": "lunge",
        "instructions": "Step forward, lower under control, and drive through the front leg.",
    },
    {
        "name": "Glute Bridge",
        "primary_muscle_group": "glutes",
        "secondary_muscle_groups": ["hamstrings"],
        "equipment": "bodyweight",
        "movement_pattern": "hinge",
        "instructions": "Bridge hips upward while keeping the pelvis controlled.",
    },
    {
        "name": "Standing Calf Raise",
        "primary_muscle_group": "calves",
        "secondary_muscle_groups": [],
        "equipment": "machine",
        "movement_pattern": "plantar flexion",
        "instructions": "Rise onto the balls of the feet, pause, and lower into a stretch.",
    },
    {
        "name": "Seated Calf Raise",
        "primary_muscle_group": "calves",
        "secondary_muscle_groups": [],
        "equipment": "machine",
        "movement_pattern": "plantar flexion",
        "instructions": "Press through the forefoot and control the lower position.",
    },
    {
        "name": "Barbell Curl",
        "primary_muscle_group": "biceps",
        "secondary_muscle_groups": ["forearms"],
        "equipment": "barbell",
        "movement_pattern": "elbow flexion",
        "instructions": "Curl without swinging and lower the bar under control.",
    },
    {
        "name": "Hammer Curl",
        "primary_muscle_group": "biceps",
        "secondary_muscle_groups": ["forearms"],
        "equipment": "dumbbell",
        "movement_pattern": "elbow flexion",
        "instructions": "Curl with palms facing each other and elbows pinned near the torso.",
    },
    {
        "name": "Preacher Curl",
        "primary_muscle_group": "biceps",
        "secondary_muscle_groups": [],
        "equipment": "machine",
        "movement_pattern": "elbow flexion",
        "instructions": "Keep upper arms on the pad and curl through a smooth range.",
    },
    {
        "name": "Triceps Pushdown",
        "primary_muscle_group": "triceps",
        "secondary_muscle_groups": [],
        "equipment": "cable",
        "movement_pattern": "elbow extension",
        "instructions": "Extend elbows fully while keeping upper arms fixed.",
    },
    {
        "name": "Skull Crusher",
        "primary_muscle_group": "triceps",
        "secondary_muscle_groups": [],
        "equipment": "barbell",
        "movement_pattern": "elbow extension",
        "instructions": "Lower the bar toward the forehead and extend without flaring elbows excessively.",
    },
    {
        "name": "Close-Grip Bench Press",
        "primary_muscle_group": "triceps",
        "secondary_muscle_groups": ["chest"],
        "equipment": "barbell",
        "movement_pattern": "horizontal press",
        "instructions": "Bench with a narrower grip and keep elbows tucked.",
    },
    {
        "name": "Plank",
        "primary_muscle_group": "core",
        "secondary_muscle_groups": ["shoulders"],
        "equipment": "bodyweight",
        "movement_pattern": "anti-extension",
        "instructions": "Brace the torso and hold a straight line without sagging.",
    },
    {
        "name": "Hanging Leg Raise",
        "primary_muscle_group": "core",
        "secondary_muscle_groups": ["hip flexors"],
        "equipment": "bodyweight",
        "movement_pattern": "trunk flexion",
        "instructions": "Raise legs under control while minimizing swing.",
    },
    {
        "name": "Cable Crunch",
        "primary_muscle_group": "core",
        "secondary_muscle_groups": [],
        "equipment": "cable",
        "movement_pattern": "trunk flexion",
        "instructions": "Flex the spine against cable resistance and control the return.",
    },
]


def seed_exercises() -> int:
    created = 0
    with SessionLocal() as db:
        existing_names = set(db.scalars(select(Exercise.name).where(Exercise.is_custom.is_(False))))
        for exercise in EXERCISES:
            if exercise["name"] in existing_names:
                continue
            db.add(Exercise(**exercise, is_custom=False, created_by_user_id=None))
            created += 1
        db.commit()
    return created


if __name__ == "__main__":
    count = seed_exercises()
    print(f"Seeded {count} exercise(s)")
