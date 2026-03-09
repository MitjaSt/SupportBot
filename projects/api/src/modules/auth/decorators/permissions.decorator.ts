import { SetMetadata } from '@nestjs/common';
import { PERMISSIONS_KEY } from '../auth.constants';

export const Permissions = (...perms: string[]) => SetMetadata(PERMISSIONS_KEY, perms);
