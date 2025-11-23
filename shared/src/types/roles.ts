/**
 * Role Types for NAMELESS
 */

export type UserRole = "host" | "sharer" | "annotator" | "viewer";

export interface RoleCapabilities {
  canAnnotate: boolean;
  canDeleteOwnStrokes: boolean;
  canDeleteAnyStroke: boolean;
  canClearAll: boolean;
  canShareScreen: boolean;
  canManageUsers: boolean;
}

export const ROLE_CAPABILITIES: Record<UserRole, RoleCapabilities> = {
  host: {
    canAnnotate: true,
    canDeleteOwnStrokes: true,
    canDeleteAnyStroke: true,
    canClearAll: true,
    canShareScreen: true,
    canManageUsers: true,
  },
  sharer: {
    canAnnotate: true,
    canDeleteOwnStrokes: true,
    canDeleteAnyStroke: true,
    canClearAll: true,
    canShareScreen: true,
    canManageUsers: false,
  },
  annotator: {
    canAnnotate: true,
    canDeleteOwnStrokes: true,
    canDeleteAnyStroke: false,
    canClearAll: false,
    canShareScreen: false,
    canManageUsers: false,
  },
  viewer: {
    canAnnotate: false,
    canDeleteOwnStrokes: false,
    canDeleteAnyStroke: false,
    canClearAll: false,
    canShareScreen: false,
    canManageUsers: false,
  },
};
