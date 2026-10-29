"use client";

import { Notification01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { Notification } from "@luraba/contracts";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  useDeleteNotificationMutation,
  useMarkAllNotificationsReadMutation,
  useMarkNotificationReadMutation,
} from "@/mutations/notifications/use-notification-mutations";
import {
  useNotificationsQuery,
  useUnreadNotificationCountQuery,
} from "@/queries/notifications/use-notifications-queries";

const INBOX_PAGE_SIZE = 20;

function formatRelativeTime(iso: string): string {
  const seconds = Math.round((new Date(iso).getTime() - Date.now()) / 1000);
  const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  const steps: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ["day", 86_400],
    ["hour", 3_600],
    ["minute", 60],
  ];

  for (const [unit, size] of steps) {
    if (Math.abs(seconds) >= size) return formatter.format(Math.round(seconds / size), unit);
  }
  return "just now";
}

function NotificationItem({
  notification,
  onOpen,
  onDelete,
}: {
  notification: Notification;
  onOpen: (notification: Notification) => void;
  onDelete: (id: string) => void;
}) {
  const unread = notification.readAt === null;

  return (
    <li className="group relative border-b border-border/60 last:border-b-0">
      <button
        type="button"
        onClick={() => onOpen(notification)}
        className="flex w-full gap-3 px-4 py-3 text-left outline-none transition-colors hover:bg-muted/60 focus-visible:bg-muted/60"
      >
        <span
          aria-hidden
          className={cn(
            "mt-1.5 size-2 shrink-0 rounded-full",
            unread ? "bg-primary" : "bg-transparent",
          )}
        />
        <span className="min-w-0 flex-1 space-y-0.5 pr-6">
          <span className={cn("block text-xs", unread && "font-medium")}>{notification.title}</span>
          <span className="block text-xs text-muted-foreground">{notification.body}</span>
          <span className="block text-[0.68rem] text-muted-foreground">
            {formatRelativeTime(notification.createdAt)}
          </span>
        </span>
      </button>
      <button
        type="button"
        aria-label="Delete notification"
        onClick={() => onDelete(notification.id)}
        className="absolute top-2 right-3 rounded-md px-1.5 py-0.5 text-xs text-muted-foreground opacity-0 outline-none transition-opacity hover:text-foreground focus-visible:opacity-100 group-hover:opacity-100"
      >
        ×
      </button>
    </li>
  );
}

export function NotificationBell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const unreadQuery = useUnreadNotificationCountQuery();
  const listQuery = useNotificationsQuery({ perPage: INBOX_PAGE_SIZE }, { enabled: open });
  const markRead = useMarkNotificationReadMutation({ errorToast: false });
  const markAllRead = useMarkAllNotificationsReadMutation();
  const remove = useDeleteNotificationMutation();

  const unreadCount = unreadQuery.data?.count ?? 0;
  const notifications = listQuery.data?.data ?? [];

  function openNotification(notification: Notification) {
    if (notification.readAt === null) markRead.mutate(notification.id);
    if (notification.url) {
      setOpen(false);
      router.push(notification.url);
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="relative ml-auto rounded-xl border-border/80"
          aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications"}
        >
          <HugeiconsIcon icon={Notification01Icon} strokeWidth={2} />
          {unreadCount > 0 ? (
            <span className="absolute -top-1 -right-1 flex min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[0.6rem] leading-4 font-medium text-primary-foreground">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[22rem] max-w-[calc(100vw-2rem)] gap-0 p-0">
        <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
          <p className="text-sm font-medium">Notifications</p>
          <Button
            variant="ghost"
            size="sm"
            disabled={unreadCount === 0 || markAllRead.isPending}
            onClick={() => markAllRead.mutate()}
          >
            Mark all read
          </Button>
        </div>

        <div className="max-h-96 overflow-y-auto">
          {listQuery.isLoading ? (
            <div className="space-y-2 p-4">
              <Skeleton className="h-10" />
              <Skeleton className="h-10" />
            </div>
          ) : listQuery.isError ? (
            <p className="p-4 text-xs text-muted-foreground">Couldn't load notifications.</p>
          ) : notifications.length === 0 ? (
            <p className="p-6 text-center text-xs text-muted-foreground">You're all caught up.</p>
          ) : (
            <ul>
              {notifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onOpen={openNotification}
                  onDelete={(id) => remove.mutate(id)}
                />
              ))}
            </ul>
          )}
        </div>

        <div className="border-t border-border/60 px-4 py-2 text-right">
          <Link
            href="/settings/notifications"
            onClick={() => setOpen(false)}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Notification settings
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}
