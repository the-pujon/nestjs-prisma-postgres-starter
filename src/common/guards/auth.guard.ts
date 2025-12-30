import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { Request } from "express";
import { Observable } from "rxjs";
// import * as jwt from 'jsonwebtoken';

@Injectable()
export class AuthGuard implements CanActivate {
    canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {

        const request = context.switchToHttp().getRequest();
        const token = this.extractTokenFromHeader(request);

        console.log("token", token);

        if (!token) {
            throw new UnauthorizedException('No Token Found');
        }

        try {

            // const payload = jwt.verify(token, process.env.JWT_SECRET!);
            // console.log("payload", payload);

            // request['user'] = payload;

            return true;

        } catch (error) {
            throw new UnauthorizedException('Invalid Token');

        }


    }




    /**
     * 
     * @param request 
     * @returns 
     * For Extracting Token from Header if token is not found then return undefined
     * For this function token will come with header in format Bearer <token> not cookies 
     */
    private extractTokenFromHeader(request: Request): string | undefined {
        const authHeader = request.headers.authorization;
        if (!authHeader) {
            return undefined;
        }

        const [type, token] = authHeader.split(' ');
        return type === 'Bearer' ? token : undefined;
    }


    /**
     * 
     * @param request 
     * @returns 
     * For Extracting Token from Cookies if token is not found then return undefined
     * For this function token will come with cookies not header 
     */
    private extractTokenFromCookies(request: Request): string | undefined {
        const token = request.cookies['token'];
        if (!token) {
            return undefined;
        }
        return token;
    }
}