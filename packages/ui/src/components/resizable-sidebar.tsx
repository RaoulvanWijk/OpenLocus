'use client'

import { Button } from '@openlocus/ui/components/button'
import { Input } from '@openlocus/ui/components/input'
import { Separator } from '@openlocus/ui/components/separator'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@openlocus/ui/components/sheet'
import { Skeleton } from '@openlocus/ui/components/skeleton'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@openlocus/ui/components/tooltip'
import { useIsMobile } from '@openlocus/ui/hooks/use-mobile'
import { cn } from '@openlocus/ui/lib/utils'
import { cva, type VariantProps } from 'class-variance-authority'
import { PanelLeftIcon } from 'lucide-react'
import { Slot } from 'radix-ui'
import * as React from 'react'
import * as ResizablePrimitive from 'react-resizable-panels'

// ─── Constants ──────────────────────────────────────────────────────────────

const SIDEBAR_COOKIE_NAME = 'sidebar_state'
const SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 7
const SIDEBAR_WIDTH_MOBILE = '18rem'
const SIDEBAR_KEYBOARD_SHORTCUT = 'b'

// ─── Context ────────────────────────────────────────────────────────────────

type ResizableSidebarContextProps = {
  state: 'expanded' | 'collapsed'
  open: boolean
  setOpen: (open: boolean) => void
  openMobile: boolean
  setOpenMobile: (open: boolean) => void
  isMobile: boolean
  toggleSidebar: () => void
  panelRef: React.RefObject<ResizablePrimitive.PanelImperativeHandle | null>
}

const ResizableSidebarContext = React.createContext<ResizableSidebarContextProps | null>(null)

function useResizableSidebar() {
  const context = React.useContext(ResizableSidebarContext)
  if (!context) {
    throw new Error('useResizableSidebar must be used within a ResizableSidebarProvider.')
  }
  return context
}

// ─── Provider ───────────────────────────────────────────────────────────────

function ResizableSidebarProvider({
  defaultOpen = true,
  open: openProp,
  onOpenChange: setOpenProp,
  className,
  style,
  children,
  ...props
}: React.ComponentProps<'div'> & {
  defaultOpen?: boolean
  open?: boolean
  onOpenChange?: (open: boolean) => void
}) {
  const isMobile = useIsMobile()
  const [openMobile, setOpenMobile] = React.useState(false)
  const panelRef = React.useRef<ResizablePrimitive.PanelImperativeHandle>(null)

  const [_open, _setOpen] = React.useState(defaultOpen)
  const open = openProp ?? _open

  const setOpen = React.useCallback(
    (value: boolean | ((value: boolean) => boolean)) => {
      const openState = typeof value === 'function' ? value(open) : value
      if (setOpenProp) {
        setOpenProp(openState)
      } else {
        _setOpen(openState)
      }
      document.cookie = `${SIDEBAR_COOKIE_NAME}=${openState}; path=/; max-age=${SIDEBAR_COOKIE_MAX_AGE}`
    },
    [setOpenProp, open],
  )

  const toggleSidebar = React.useCallback(() => {
    if (isMobile) {
      setOpenMobile((o) => !o)
      return
    }
    const panel = panelRef.current
    if (panel) {
      if (panel.isCollapsed()) {
        panel.expand()
      } else {
        panel.collapse()
      }
    }
  }, [isMobile])

  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === SIDEBAR_KEYBOARD_SHORTCUT && (event.metaKey || event.ctrlKey)) {
        event.preventDefault()
        toggleSidebar()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [toggleSidebar])

  const state = open ? 'expanded' : 'collapsed'

  const contextValue = React.useMemo<ResizableSidebarContextProps>(
    () => ({
      state,
      open,
      setOpen,
      isMobile,
      openMobile,
      setOpenMobile,
      toggleSidebar,
      panelRef,
    }),
    [state, open, setOpen, isMobile, openMobile, setOpenMobile, toggleSidebar],
  )

  return (
    <ResizableSidebarContext.Provider value={contextValue}>
      <TooltipProvider delayDuration={0}>
        <div
          data-slot="sidebar-wrapper"
          style={style}
          className={cn('group/sidebar-wrapper flex min-h-svh w-full', className)}
          {...props}
        >
          {children}
        </div>
      </TooltipProvider>
    </ResizableSidebarContext.Provider>
  )
}

// ─── ResizableSidebarLayout ──────────────────────────────────────────────────
// The PanelGroup. Panel and Separator must be direct children of this.

function ResizableSidebarLayout({
  className,
  ...props
}: Omit<ResizablePrimitive.GroupProps, 'orientation'>) {
  return (
    <ResizablePrimitive.Group
      data-slot="sidebar-layout"
      orientation="horizontal"
      className={cn('flex h-full w-full', className)}
      {...props}
    />
  )
}

// ─── ResizableSidebar ────────────────────────────────────────────────────────

function ResizableSidebar({
  side = 'left',
  collapsible = 'offcanvas',
  defaultSize = '16rem',
  minSize = '10rem',
  maxSize = '24rem',
  collapsedSize,
  className,
  children,
  id,
}: Omit<React.ComponentProps<'div'>, 'id'> & {
  side?: 'left' | 'right'
  collapsible?: 'offcanvas' | 'icon' | 'none'
  defaultSize?: number | string
  minSize?: number | string
  maxSize?: number | string
  collapsedSize?: number | string
  id?: string
}) {
  const { isMobile, openMobile, setOpenMobile, setOpen } = useResizableSidebar()
  const localPanelRef = React.useRef<ResizablePrimitive.PanelImperativeHandle>(null)
  const [localState, setLocalState] = React.useState<'expanded' | 'collapsed'>('expanded')

  const handleResize = React.useCallback(() => {
    const panel = localPanelRef.current
    if (panel) {
      const collapsed = panel.isCollapsed()
      setLocalState(collapsed ? 'collapsed' : 'expanded')
      setOpen(!collapsed)
    }
  }, [setOpen])

  const state = localState

  const resolvedCollapsedSize = collapsedSize ?? (collapsible === 'icon' ? '3rem' : 0)

  if (collapsible === 'none') {
    return (
      <ResizablePrimitive.Panel
        data-slot="sidebar"
        data-sidebar="sidebar"
        data-side={side}
        id={id}
        defaultSize={defaultSize}
        minSize={minSize}
        maxSize={maxSize}
        className={cn('bg-sidebar text-sidebar-foreground flex h-full flex-col', className)}
      >
        {children}
      </ResizablePrimitive.Panel>
    )
  }

  if (isMobile) {
    return (
      <Sheet open={openMobile} onOpenChange={setOpenMobile}>
        <SheetContent
          data-sidebar="sidebar"
          data-slot="sidebar"
          data-mobile="true"
          className="bg-sidebar text-sidebar-foreground w-(--sidebar-width) p-0 [&>button]:hidden"
          style={{ '--sidebar-width': SIDEBAR_WIDTH_MOBILE } as React.CSSProperties}
          side={side}
        >
          <SheetHeader className="sr-only">
            <SheetTitle>Sidebar</SheetTitle>
            <SheetDescription>Displays the mobile sidebar.</SheetDescription>
          </SheetHeader>
          <div className="flex h-full w-full flex-col">{children}</div>
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <ResizablePrimitive.Panel
      panelRef={localPanelRef}
      data-slot="sidebar"
      data-side={side}
      id={id}
      defaultSize={defaultSize}
      minSize={minSize}
      maxSize={maxSize}
      collapsible
      collapsedSize={resolvedCollapsedSize}
      onResize={handleResize}
    >
      <div
        className={cn(
          'group bg-sidebar text-sidebar-foreground flex h-full w-full flex-col overflow-hidden transition-[flex-basis] duration-200 ease-linear',
          className,
        )}
        data-slot="sidebar-inner"
        data-state={state}
        data-collapsible={state === 'collapsed' ? collapsible : ''}
      >
        {children}
      </div>
    </ResizablePrimitive.Panel>
  )
}

// ─── ResizableSidebarHandle ──────────────────────────────────────────────────

function ResizableSidebarHandle({
  withHandle,
  className,
  onClick,
  ...props
}: ResizablePrimitive.SeparatorProps & {
  withHandle?: boolean
  onClick?: React.MouseEventHandler<HTMLDivElement>
}) {
  const { toggleSidebar } = useResizableSidebar()
  const mouseDownX = React.useRef<number | null>(null)

  return (
    <ResizablePrimitive.Separator
      data-slot="sidebar-handle"
      onMouseDown={(e) => (mouseDownX.current = e.clientX)}
      onClick={(e) => {
        if (mouseDownX.current !== null && Math.abs(e.clientX - mouseDownX.current) < 4) {
          toggleSidebar()
          onClick?.(e)
        }
        mouseDownX.current = null
      }}
      className={cn(
        'bg-border focus-visible:ring-ring relative flex w-px items-center justify-center after:absolute after:inset-y-0 after:left-1/2 after:w-1 after:-translate-x-1/2 focus-visible:ring-1 focus-visible:ring-offset-1 focus-visible:outline-hidden',
        className,
      )}
      {...props}
    >
      {withHandle && (
        <div className="bg-border z-10 flex h-4 w-3 items-center justify-center rounded-xs border">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="10"
            height="10"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="9" cy="12" r="1" />
            <circle cx="9" cy="5" r="1" />
            <circle cx="9" cy="19" r="1" />
            <circle cx="15" cy="12" r="1" />
            <circle cx="15" cy="5" r="1" />
            <circle cx="15" cy="19" r="1" />
          </svg>
        </div>
      )}
    </ResizablePrimitive.Separator>
  )
}

// ─── ResizableSidebarTrigger ─────────────────────────────────────────────────

function ResizableSidebarTrigger({
  className,
  onClick,
  ...props
}: React.ComponentProps<typeof Button>) {
  const { toggleSidebar } = useResizableSidebar()

  return (
    <Button
      data-sidebar="trigger"
      data-slot="sidebar-trigger"
      variant="ghost"
      size="icon"
      className={cn('size-7', className)}
      onClick={(event) => {
        onClick?.(event)
        toggleSidebar()
      }}
      {...props}
    >
      <PanelLeftIcon />
      <span className="sr-only">Toggle Sidebar</span>
    </Button>
  )
}

// ─── ResizableSidebarInset ───────────────────────────────────────────────────

function ResizableSidebarInset({
  className,
  children,
  minSize = '32rem',
  ...props
}: React.ComponentProps<'div'> & { minSize?: number | string }) {
  return (
    <ResizablePrimitive.Panel
      data-slot="sidebar-inset"
      minSize={minSize}
      className={cn('bg-background relative flex w-full flex-1 flex-col', className)}
    >
      <div className="flex h-full w-full flex-col" {...props}>
        {children}
      </div>
    </ResizablePrimitive.Panel>
  )
}

// ─── Sub-components ──────────────────────────────────────────────────────────
// Fully self-contained — no dependency on sidebar.tsx.
// SidebarMenuButton uses useResizableSidebar for tooltip visibility logic.

function ResizableSidebarInput({ className, ...props }: React.ComponentProps<typeof Input>) {
  return (
    <Input
      data-slot="sidebar-input"
      data-sidebar="input"
      className={cn('bg-background h-8 w-full shadow-none', className)}
      {...props}
    />
  )
}

function ResizableSidebarHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="sidebar-header"
      data-sidebar="header"
      className={cn('flex flex-col gap-2 p-2', className)}
      {...props}
    />
  )
}

function ResizableSidebarFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="sidebar-footer"
      data-sidebar="footer"
      className={cn('flex flex-col gap-2 p-2', className)}
      {...props}
    />
  )
}

function ResizableSidebarSeparator({
  className,
  ...props
}: React.ComponentProps<typeof Separator>) {
  return (
    <Separator
      data-slot="sidebar-separator"
      data-sidebar="separator"
      className={cn('bg-border data-[orientation=horizontal]:w-auto', className)}
      {...props}
    />
  )
}

function ResizableSidebarContent({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="sidebar-content"
      data-sidebar="content"
      className={cn(
        'flex min-h-0 flex-1 flex-col gap-2 overflow-auto group-data-[collapsible=icon]:overflow-hidden',
        className,
      )}
      {...props}
    />
  )
}

function ResizableSidebarGroup({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="sidebar-group"
      data-sidebar="group"
      className={cn('relative flex w-full min-w-0 flex-col p-2', className)}
      {...props}
    />
  )
}

function ResizableSidebarGroupLabel({
  className,
  asChild = false,
  ...props
}: React.ComponentProps<'div'> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : 'div'
  return (
    <Comp
      data-slot="sidebar-group-label"
      data-sidebar="group-label"
      className={cn(
        'text-sidebar-foreground/70 ring-sidebar-ring flex h-8 shrink-0 items-center rounded-md px-2 text-xs font-medium outline-hidden transition-[margin,opacity] duration-200 ease-linear focus-visible:ring-2 [&>svg]:size-4 [&>svg]:shrink-0',
        'group-data-[collapsible=icon]:-mt-8 group-data-[collapsible=icon]:opacity-0',
        className,
      )}
      {...props}
    />
  )
}

function ResizableSidebarGroupAction({
  className,
  asChild = false,
  ...props
}: React.ComponentProps<'button'> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : 'button'
  return (
    <Comp
      data-slot="sidebar-group-action"
      data-sidebar="group-action"
      className={cn(
        'text-sidebar-foreground ring-sidebar-ring hover:bg-sidebar-accent hover:text-sidebar-accent-foreground absolute top-3.5 right-3 flex aspect-square w-5 items-center justify-center rounded-md p-0 outline-hidden transition-transform focus-visible:ring-2 [&>svg]:size-4 [&>svg]:shrink-0',
        'after:absolute after:-inset-2 md:after:hidden',
        'group-data-[collapsible=icon]:hidden',
        className,
      )}
      {...props}
    />
  )
}

function ResizableSidebarGroupContent({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="sidebar-group-content"
      data-sidebar="group-content"
      className={cn('w-full text-sm', className)}
      {...props}
    />
  )
}

function ResizableSidebarMenu({ className, ...props }: React.ComponentProps<'ul'>) {
  return (
    <ul
      data-slot="sidebar-menu"
      data-sidebar="menu"
      className={cn('flex w-full min-w-0 flex-col gap-1', className)}
      {...props}
    />
  )
}

function ResizableSidebarMenuItem({ className, ...props }: React.ComponentProps<'li'>) {
  return (
    <li
      data-slot="sidebar-menu-item"
      data-sidebar="menu-item"
      className={cn('group/menu-item relative', className)}
      {...props}
    />
  )
}

const sidebarMenuButtonVariants = cva(
  'peer/menu-button flex w-full items-center gap-2 overflow-hidden rounded-md duration-200 p-2 text-left text-sm ring-sidebar-ring outline-hidden transition-[width,height,padding] group-has-data-[sidebar=menu-action]/menu-item:pr-8 group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:p-2! hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 active:bg-sidebar-accent active:text-sidebar-accent-foreground disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 data-[active=true]:bg-sidebar-accent data-[active=true]:font-medium data-[active=true]:text-sidebar-accent-foreground data-[state=open]:hover:bg-sidebar-accent data-[state=open]:hover:text-sidebar-accent-foreground [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0',
  {
    variants: {
      variant: {
        default: 'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
        outline:
          'bg-background shadow-[0_0_0_1px_hsl(var(--sidebar-border))] hover:bg-sidebar-accent hover:text-sidebar-accent-foreground hover:shadow-[0_0_0_1px_hsl(var(--sidebar-accent))]',
        ghost: '',
      },
      size: {
        default: 'h-8 text-sm',
        sm: 'h-7 text-xs',
        lg: 'h-12 text-sm group-data-[collapsible=icon]:p-0!',
        auto: 'h-auto text-sm',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

function ResizableSidebarMenuButton({
  asChild = false,
  isActive = false,
  variant = 'default',
  size = 'default',
  tooltip,
  className,
  ...props
}: React.ComponentProps<'button'> & {
  asChild?: boolean
  isActive?: boolean
  tooltip?: string | React.ComponentProps<typeof TooltipContent>
} & VariantProps<typeof sidebarMenuButtonVariants>) {
  const Comp = asChild ? Slot.Root : 'button'
  const { isMobile, state } = useResizableSidebar()

  const button = (
    <Comp
      data-slot="sidebar-menu-button"
      data-sidebar="menu-button"
      data-size={size}
      data-active={isActive}
      className={cn(sidebarMenuButtonVariants({ variant, size }), className)}
      {...props}
    />
  )

  if (!tooltip) return button

  if (typeof tooltip === 'string') {
    tooltip = { children: tooltip }
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>{button}</TooltipTrigger>
      <TooltipContent
        side="right"
        align="center"
        hidden={state !== 'collapsed' || isMobile}
        {...tooltip}
      />
    </Tooltip>
  )
}

function ResizableSidebarMenuAction({
  className,
  asChild = false,
  showOnHover = false,
  ...props
}: React.ComponentProps<'button'> & { asChild?: boolean; showOnHover?: boolean }) {
  const Comp = asChild ? Slot.Root : 'button'
  return (
    <Comp
      data-slot="sidebar-menu-action"
      data-sidebar="menu-action"
      className={cn(
        'text-sidebar-foreground ring-sidebar-ring peer-hover/menu-button:text-sidebar-accent-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground absolute top-1.5 right-1 flex aspect-square w-5 items-center justify-center rounded-md p-0 outline-hidden transition-transform focus-visible:ring-2 [&>svg]:size-4 [&>svg]:shrink-0',
        'after:absolute after:-inset-2 md:after:hidden',
        'peer-data-[size=sm]/menu-button:top-1',
        'peer-data-[size=default]/menu-button:top-1.5',
        'peer-data-[size=lg]/menu-button:top-2.5',
        'group-data-[collapsible=icon]:hidden',
        showOnHover &&
          'peer-data-[active=true]/menu-button:text-sidebar-accent-foreground group-focus-within/menu-item:opacity-100 group-hover/menu-item:opacity-100 data-[state=open]:opacity-100 md:opacity-0',
        className,
      )}
      {...props}
    />
  )
}

function ResizableSidebarMenuBadge({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="sidebar-menu-badge"
      data-sidebar="menu-badge"
      className={cn(
        'text-sidebar-foreground pointer-events-none absolute right-1 flex h-5 min-w-5 items-center justify-center rounded-md px-1 text-xs font-medium tabular-nums select-none',
        'peer-hover/menu-button:text-sidebar-accent-foreground peer-data-[active=true]/menu-button:text-sidebar-accent-foreground',
        'peer-data-[size=sm]/menu-button:top-1',
        'peer-data-[size=default]/menu-button:top-1.5',
        'peer-data-[size=lg]/menu-button:top-2.5',
        'group-data-[collapsible=icon]:hidden',
        className,
      )}
      {...props}
    />
  )
}

function ResizableSidebarMenuSkeleton({
  className,
  showIcon = false,
  ...props
}: React.ComponentProps<'div'> & { showIcon?: boolean }) {
  const width = React.useMemo(() => `${Math.floor(Math.random() * 40) + 50}%`, [])
  return (
    <div
      data-slot="sidebar-menu-skeleton"
      data-sidebar="menu-skeleton"
      className={cn('flex h-8 items-center gap-2 rounded-md px-2', className)}
      {...props}
    >
      {showIcon && <Skeleton className="size-4 rounded-md" data-sidebar="menu-skeleton-icon" />}
      <Skeleton
        className="h-4 max-w-(--skeleton-width) flex-1"
        data-sidebar="menu-skeleton-text"
        style={{ '--skeleton-width': width } as React.CSSProperties}
      />
    </div>
  )
}

function ResizableSidebarMenuSub({ className, ...props }: React.ComponentProps<'ul'>) {
  return (
    <ul
      data-slot="sidebar-menu-sub"
      data-sidebar="menu-sub"
      className={cn(
        'border-sidebar-border mx-3.5 flex min-w-0 translate-x-px flex-col gap-1 border-l px-2.5 py-0.5',
        'group-data-[collapsible=icon]:hidden',
        className,
      )}
      {...props}
    />
  )
}

function ResizableSidebarMenuSubItem({ className, ...props }: React.ComponentProps<'li'>) {
  return (
    <li
      data-slot="sidebar-menu-sub-item"
      data-sidebar="menu-sub-item"
      className={cn('group/menu-sub-item relative', className)}
      {...props}
    />
  )
}

function ResizableSidebarMenuSubButton({
  asChild = false,
  size = 'md',
  isActive = false,
  className,
  ...props
}: React.ComponentProps<'a'> & { asChild?: boolean; size?: 'sm' | 'md'; isActive?: boolean }) {
  const Comp = asChild ? Slot.Root : 'a'
  return (
    <Comp
      data-slot="sidebar-menu-sub-button"
      data-sidebar="menu-sub-button"
      data-size={size}
      data-active={isActive}
      className={cn(
        'text-sidebar-foreground ring-sidebar-ring hover:bg-sidebar-accent hover:text-sidebar-accent-foreground active:bg-sidebar-accent active:text-sidebar-accent-foreground [&>svg]:text-sidebar-accent-foreground flex h-7 min-w-0 -translate-x-px items-center gap-2 overflow-hidden rounded-md px-2 outline-hidden focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0',
        'data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground',
        size === 'sm' && 'text-xs',
        size === 'md' && 'text-sm',
        'group-data-[collapsible=icon]:hidden',
        className,
      )}
      {...props}
    />
  )
}

// ─── Exports ────────────────────────────────────────────────────────────────

export {
  ResizableSidebar,
  ResizableSidebarContent,
  ResizableSidebarContext,
  ResizableSidebarFooter,
  ResizableSidebarGroup,
  ResizableSidebarGroupAction,
  ResizableSidebarGroupContent,
  ResizableSidebarGroupLabel,
  ResizableSidebarHandle,
  ResizableSidebarHeader,
  ResizableSidebarInput,
  ResizableSidebarInset,
  ResizableSidebarLayout,
  ResizableSidebarMenu,
  ResizableSidebarMenuAction,
  ResizableSidebarMenuBadge,
  ResizableSidebarMenuButton,
  ResizableSidebarMenuItem,
  ResizableSidebarMenuSkeleton,
  ResizableSidebarMenuSub,
  ResizableSidebarMenuSubButton,
  ResizableSidebarMenuSubItem,
  ResizableSidebarProvider,
  ResizableSidebarSeparator,
  ResizableSidebarTrigger,
  useResizableSidebar,
}
