import { SetMetadata } from '@nestjs/common';
import { OPTIONAL_AUTH_KEY } from '../auth.constants';

export const OptionalAuth = () => SetMetadata(OPTIONAL_AUTH_KEY, true);
