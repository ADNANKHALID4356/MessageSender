import { Strategy } from 'passport-local';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../auth.service';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    super({
      usernameField: 'username',
      passwordField: 'password',
    });
  }

  async validate(username: string, password: string): Promise<any> {
    // Try admin first
    let user = await this.authService.validateAdmin(username, password);

    // If not admin, try user
    if (!user) {
      user = await this.authService.validateUser(username, password);
    }

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return user;
  }
}
