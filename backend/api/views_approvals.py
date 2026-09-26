from typing import cast

from drf_spectacular.utils import extend_schema
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from api.serializers.approval_serializer import (
    ApprovalDecideSerializer,
    ApprovalQueueSerializer,
)
from api.services import approval_decide, approval_queue


class ApprovalView(APIView):
    @extend_schema(responses={200: ApprovalQueueSerializer(many=True)})
    def get(self, request: Request) -> Response:
        user = request.user
        steps = approval_queue.get_approval_steps(user)

        serializer = ApprovalQueueSerializer(steps, many=True)
        return Response(serializer.data)


class ApprovalDecideView(APIView):
    @extend_schema(request=ApprovalDecideSerializer, responses={204: None})
    def post(self, request: Request, step_id: int) -> Response:
        serializer = ApprovalDecideSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        validated_data = cast(dict, serializer.validated_data)

        approval_decide.decide(
            user=request.user,
            step_id=step_id,
            decision=validated_data["decision"],
            comment=validated_data.get("comment", ""),
        )

        return Response(status=204)
