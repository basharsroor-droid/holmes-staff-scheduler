import { registerPlugin, type PluginListenerHandle } from "@capacitor/core";

export type PushToken = { value: string };
type PermissionState = "prompt" | "prompt-with-rationale" | "granted" | "denied";
type PushAction = { notification: { data?: Record<string, unknown> } };

type PushNotificationsPlugin = {
  checkPermissions(): Promise<{ receive: PermissionState }>;
  requestPermissions(): Promise<{ receive: PermissionState }>;
  register(): Promise<void>;
  addListener(eventName: "registration", listener: (token: PushToken) => void): Promise<PluginListenerHandle>;
  addListener(eventName: "registrationError", listener: (error: { error: string }) => void): Promise<PluginListenerHandle>;
  addListener(eventName: "pushNotificationActionPerformed", listener: (event: PushAction) => void): Promise<PluginListenerHandle>;
};

export const PushNotifications = registerPlugin<PushNotificationsPlugin>("PushNotifications");
