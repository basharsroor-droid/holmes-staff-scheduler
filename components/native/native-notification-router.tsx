"use client";

import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

const MY_SHIFTS_ROUTE = "/workspace/my-shifts";

export function NativeNotificationRouter() {
  const router = useRouter();

  useEffect(() => {
    if (!Capacitor.isNativePlatform() || !Capacitor.isPluginAvailable("LocalNotifications")) return;

    let active = true;
    let removeListener: (() => Promise<void>) | undefined;

    // Handle registration failures immediately. Waiting until effect cleanup to
    // attach a rejection handler causes an unhandledrejection on native builds
    // where the plugin was not bundled correctly.
    void LocalNotifications.addListener("localNotificationActionPerformed", (event) => {
        // Never navigate to an arbitrary value supplied through notification
        // metadata. Version 1 has one supported notification destination.
        if (event.notification.extra?.route === MY_SHIFTS_ROUTE) {
          router.push(MY_SHIFTS_ROUTE);
        }
      })
      .then((handle) => {
        if (!active) {
          void handle.remove();
          return;
        }
        removeListener = () => handle.remove();
      })
      .catch(() => {
        // Notifications are optional; login and navigation must keep working
        // when an older iOS binary does not include the native plugin.
      });

    return () => {
      active = false;
      void removeListener?.();
    };
  }, [router]);

  return null;
}
