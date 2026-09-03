"use client";

import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

const MY_SHIFTS_ROUTE = "/workspace/my-shifts";

export function NativeNotificationRouter() {
  const router = useRouter();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const listener = LocalNotifications.addListener("localNotificationActionPerformed", (event) => {
      // Never navigate to an arbitrary value supplied through notification
      // metadata. Version 1 has one supported notification destination.
      if (event.notification.extra?.route === MY_SHIFTS_ROUTE) {
        router.push(MY_SHIFTS_ROUTE);
      }
    });

    return () => {
      void listener.then((handle) => handle.remove()).catch(() => undefined);
    };
  }, [router]);

  return null;
}
