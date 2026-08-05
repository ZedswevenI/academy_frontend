import { Injectable } from '@angular/core';
import { CommonapiService } from '../commonapi/commonapi.service';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private module = 'ims/user';

  constructor(private common: CommonapiService) {}

  listUsers(entiId: string) {
    return this.common.fetchData({ entiId }, this.module, 'list?list=full');
  }

  /** Single-user fetch keyed by the app-level userId (not the Mongo _id) —
   *  `targetUserId`, not `userId`, in the payload: the auth middleware
   *  silently overwrites a `userId` body field with the caller's own id. */
  viewUserByUserId(entiId: string, targetUserId: string) {
    return this.common.fetchData({ entiId, targetUserId }, this.module, 'view-by-userid');
  }

  createUser(payload: any) {
    return this.common.fetchData(payload, this.module, 'create');
  }

  updateUser(payload: any) {
    return this.common.fetchData(payload, this.module, 'edit');
  }

  /** Dedicated access-only endpoint — role/portal/permissions, admin-only
   *  server-side, isolated from general profile edits on purpose. */
  updateUserAccess(payload: any) {
    return this.common.fetchData(payload, this.module, 'access/update');
  }

  deleteUser(entiId: string, recId: string) {
    return this.common.fetchData({ entiId, recId }, this.module, 'delete');
  }
}
