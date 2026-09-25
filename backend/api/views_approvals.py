from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from api.serializers.approval_serializer import ApprovalQueueSerializer
from api.services import approval_queue


class ApprovalView(APIView):
    def get(self, request: Request) -> Response:
        user = request.user
        result = approval_queue.get_approval_queue(user)

        serializer = ApprovalQueueSerializer(result, many=True)
        return Response(serializer.data)
