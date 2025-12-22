export class SuccessResponseDto<T> {
  statusCode: number;
  message: string;
  data: T;
}
