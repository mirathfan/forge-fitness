from uuid import UUID

from fastapi import APIRouter, Response, status

from app.api.deps import CurrentUser, DbSession
from app.schemas.template import WorkoutTemplateCreate, WorkoutTemplateRead, WorkoutTemplateUpdate
from app.services.templates import TemplateService

router = APIRouter()


@router.get("", response_model=list[WorkoutTemplateRead])
def list_templates(current_user: CurrentUser, db: DbSession) -> list[WorkoutTemplateRead]:
    return [WorkoutTemplateRead.model_validate(item) for item in TemplateService(db).list_for_user(current_user)]


@router.post("", response_model=WorkoutTemplateRead, status_code=201)
def create_template(
    payload: WorkoutTemplateCreate,
    current_user: CurrentUser,
    db: DbSession,
) -> WorkoutTemplateRead:
    return WorkoutTemplateRead.model_validate(TemplateService(db).create(current_user, payload))


@router.get("/{template_id}", response_model=WorkoutTemplateRead)
def get_template(template_id: UUID, current_user: CurrentUser, db: DbSession) -> WorkoutTemplateRead:
    return WorkoutTemplateRead.model_validate(TemplateService(db).get(current_user, template_id))


@router.put("/{template_id}", response_model=WorkoutTemplateRead)
def update_template(
    template_id: UUID,
    payload: WorkoutTemplateUpdate,
    current_user: CurrentUser,
    db: DbSession,
) -> WorkoutTemplateRead:
    return WorkoutTemplateRead.model_validate(TemplateService(db).update(current_user, template_id, payload))


@router.delete("/{template_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_template(template_id: UUID, current_user: CurrentUser, db: DbSession) -> Response:
    TemplateService(db).delete(current_user, template_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
