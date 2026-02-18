import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface FacebookConfig {
  appId: string;
  appSecret: string;
  authAppId: string;
  authAppSecret: string;
  apiVersion: string;
  baseUrl: string;
  graphUrl: string;
  scopes: string[];
  webhookVerifyToken: string;
}

@Injectable()
export class FacebookConfigService {
  constructor(private configService: ConfigService) {}

  // ====================================================
  // PRIMARY APP: MS_Messenger (Messenger Platform)
  // Used for: OAuth page connection, Webhooks, Send API
  // ====================================================

  get appId(): string {
    return this.configService.get<string>('FACEBOOK_APP_ID', '');
  }

  get appSecret(): string {
    return this.configService.get<string>('FACEBOOK_APP_SECRET', '');
  }

  // ====================================================
  // SECONDARY APP: MS_Auth (Facebook Login) - Future use
  // Used for: "Login with Facebook" feature
  // ====================================================

  get authAppId(): string {
    return this.configService.get<string>('FACEBOOK_AUTH_APP_ID', '');
  }

  get authAppSecret(): string {
    return this.configService.get<string>('FACEBOOK_AUTH_APP_SECRET', '');
  }

  get apiVersion(): string {
    return this.configService.get<string>('FACEBOOK_API_VERSION', 'v21.0');
  }

  get baseUrl(): string {
    return 'https://www.facebook.com';
  }

  get graphUrl(): string {
    return 'https://graph.facebook.com';
  }

  get webhookVerifyToken(): string {
    return this.configService.get<string>('FACEBOOK_WEBHOOK_VERIFY_TOKEN', '');
  }

  /**
   * Required permissions for Facebook Messenger integration
   * - pages_messaging: Send and receive messages via Messenger
   * - pages_manage_metadata: Manage page settings, subscribe to webhooks
   * - pages_show_list: List pages the user manages
   *
   * Note: pages_read_engagement was deprecated by Meta and removed.
   * public_profile is implicitly granted and does not need to be listed.
   */
  get scopes(): string[] {
    return [
      'pages_messaging',
      'pages_manage_metadata',
      'pages_show_list',
    ];
  }

  get fullConfig(): FacebookConfig {
    return {
      appId: this.appId,
      appSecret: this.appSecret,
      authAppId: this.authAppId,
      authAppSecret: this.authAppSecret,
      apiVersion: this.apiVersion,
      baseUrl: this.baseUrl,
      graphUrl: this.graphUrl,
      scopes: this.scopes,
      webhookVerifyToken: this.webhookVerifyToken,
    };
  }

  /**
   * Build the OAuth authorization URL
   */
  buildAuthUrl(redirectUri: string, state: string): string {
    const params = new URLSearchParams({
      client_id: this.appId,
      redirect_uri: redirectUri,
      state,
      scope: this.scopes.join(','),
      response_type: 'code',
    });

    return `${this.baseUrl}/${this.apiVersion}/dialog/oauth?${params.toString()}`;
  }

  /**
   * Build the token exchange URL
   */
  buildTokenUrl(code: string, redirectUri: string): string {
    const params = new URLSearchParams({
      client_id: this.appId,
      client_secret: this.appSecret,
      redirect_uri: redirectUri,
      code,
    });

    return `${this.graphUrl}/${this.apiVersion}/oauth/access_token?${params.toString()}`;
  }

  /**
   * Build Graph API URL
   */
  buildGraphUrl(endpoint: string): string {
    return `${this.graphUrl}/${this.apiVersion}/${endpoint}`;
  }
}
