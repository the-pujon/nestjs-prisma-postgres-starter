export class SuccessResponseDtp<T> {
  statusCode: number;
  message: string;
  data: T;
}
