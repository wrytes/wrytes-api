import { Injectable } from '@nestjs/common';
import { version } from '../package.json';

@Injectable()
export class AppService {
  getRoot(): { message: string; version: string } {
    return { message: 'Wrytes API is running', version };
  }
}
