import { prisma } from "@/lib/prisma";

import { requireAuth } from "@/lib/auth-server";

import { getNotificationHref } from "@/lib/notifications";



export async function GET(request) {

  const { user, error } = await requireAuth(request);

  if (error) return error;



  const notifications = await prisma.notification.findMany({

    where: { employeeId: user.id },

    orderBy: { createdAt: "desc" },

    take: 20,

  });



  return Response.json({

    notifications: notifications.map((n) => ({

      id: n.id,

      title: n.title,

      message: n.message,

      module: n.module,

      read: n.isRead,

      time: formatRelativeTime(n.createdAt),

      href: getNotificationHref(n.module),

    })),

  });

}



function formatRelativeTime(date) {

  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);

  if (seconds < 60) return "Just now";

  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;

  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;

  return `${Math.floor(seconds / 86400)}d ago`;

}

