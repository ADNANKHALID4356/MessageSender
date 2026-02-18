'use client';

import { useState } from 'react';
import { Check, ChevronsUpDown, Building2, Plus, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useWorkspaceStore } from '@/stores/workspace-store';
import { Skeleton } from '@/components/ui/skeleton';

interface WorkspaceSelectorProps {
  className?: string;
  onCreateNew?: () => void;
  onManage?: () => void;
}

export function WorkspaceSelector({ className, onCreateNew, onManage }: WorkspaceSelectorProps) {
  const [open, setOpen] = useState(false);
  const { currentWorkspace, workspaces, isLoading, setCurrentWorkspace } = useWorkspaceStore();

  if (isLoading) {
    return <Skeleton className="h-9 w-[200px]" />;
  }

  if (workspaces.length === 0) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={onCreateNew}
        className={cn('gap-2', className)}
      >
        <Plus className="h-4 w-4" />
        Create Workspace
      </Button>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn('justify-between gap-2 min-w-[180px] max-w-[250px]', className)}
        >
          <div className="flex items-center gap-2 truncate">
            <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="truncate">
              {currentWorkspace?.name || 'Select workspace'}
            </span>
          </div>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[250px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search workspace..." />
          <CommandList>
            <CommandEmpty>No workspace found.</CommandEmpty>
            <CommandGroup heading="Workspaces">
              {workspaces.map((workspace) => (
                <CommandItem
                  key={workspace.id}
                  value={workspace.name}
                  onSelect={() => {
                    setCurrentWorkspace(workspace);
                    setOpen(false);
                  }}
                  className="cursor-pointer"
                >
                  <Building2 className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span className="flex-1 truncate">{workspace.name}</span>
                  {currentWorkspace?.id === workspace.id && (
                    <Check className="ml-2 h-4 w-4 text-primary" />
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
            <CommandGroup>
              {onCreateNew && (
                <CommandItem
                  onSelect={() => {
                    onCreateNew();
                    setOpen(false);
                  }}
                  className="cursor-pointer"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Create new workspace
                </CommandItem>
              )}
              {onManage && (
                <CommandItem
                  onSelect={() => {
                    onManage();
                    setOpen(false);
                  }}
                  className="cursor-pointer"
                >
                  <Settings className="mr-2 h-4 w-4" />
                  Manage workspaces
                </CommandItem>
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export default WorkspaceSelector;
