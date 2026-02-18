import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';

export function InboxSkeleton() {
  return (
    <div className="flex h-[calc(100vh-8rem)] gap-4 animate-in fade-in duration-300">
      {/* Conversation List */}
      <Card className="w-80 flex-shrink-0 flex flex-col">
        {/* Search bar */}
        <div className="p-4 border-b space-y-3">
          <Skeleton className="h-9 w-full rounded-md" />
          <div className="flex gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-7 w-16 rounded-full" />
            ))}
          </div>
        </div>
        {/* Conversation items */}
        <div className="flex-1 p-2 space-y-1">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-lg">
              <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />
              <div className="flex-1 min-w-0 space-y-1.5">
                <div className="flex justify-between">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-10" />
                </div>
                <Skeleton className="h-3 w-full" />
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Message Panel */}
      <Card className="flex-1 flex flex-col">
        {/* Header */}
        <div className="flex items-center gap-3 p-4 border-b">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="space-y-1">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-3 w-20" />
          </div>
          <div className="ml-auto flex gap-2">
            <Skeleton className="h-8 w-8 rounded-md" />
            <Skeleton className="h-8 w-8 rounded-md" />
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 p-4 space-y-4">
          {/* Inbound message */}
          <div className="flex justify-start">
            <Skeleton className="h-16 w-64 rounded-2xl rounded-bl-md" />
          </div>
          {/* Outbound message */}
          <div className="flex justify-end">
            <Skeleton className="h-12 w-48 rounded-2xl rounded-br-md" />
          </div>
          {/* Inbound */}
          <div className="flex justify-start">
            <Skeleton className="h-10 w-56 rounded-2xl rounded-bl-md" />
          </div>
          {/* Outbound */}
          <div className="flex justify-end">
            <Skeleton className="h-20 w-72 rounded-2xl rounded-br-md" />
          </div>
          <div className="flex justify-start">
            <Skeleton className="h-12 w-40 rounded-2xl rounded-bl-md" />
          </div>
        </div>

        {/* Compose bar */}
        <div className="p-4 border-t">
          <div className="flex gap-2">
            <Skeleton className="h-10 flex-1 rounded-md" />
            <Skeleton className="h-10 w-10 rounded-md" />
          </div>
        </div>
      </Card>
    </div>
  );
}
