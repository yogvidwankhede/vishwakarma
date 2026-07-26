'use client'

import { Component, type ErrorInfo, type ReactNode } from 'react'

/**
 * Catch anything the 3D layer throws and show the static alternative instead.
 *
 * This is the component that makes the optional peer dependencies genuinely optional. When
 * three is not installed, the dynamic import rejects; when the GPU process dies, the
 * renderer throws; when a model fails to parse, the loader throws — and every one of those
 * failures happens *below* the point where React can recover on its own. Without a boundary
 * here, a decorative background effect takes the entire route down with it, which is a
 * spectacularly poor trade for a piece of ornament.
 *
 * It is a class because error boundaries have no hook equivalent. There is no plan for one;
 * this is simply where React draws the line.
 */

export interface SceneBoundaryProps {
  children: ReactNode
  /** Shown once something has thrown. Normally a `SceneFallback`. */
  fallback: ReactNode
  /**
   * Called with whatever was thrown.
   *
   * Worth wiring to error reporting. A scene that quietly falls back looks fine to
   * everyone including the team, and "our 3D hero has been broken in Safari for six weeks"
   * is a discovery nobody wants to make from a support ticket.
   */
  onError?: (error: unknown, info: ErrorInfo) => void
}

interface SceneBoundaryState {
  failed: boolean
}

export class SceneBoundary extends Component<SceneBoundaryProps, SceneBoundaryState> {
  constructor(props: SceneBoundaryProps) {
    super(props)
    this.state = { failed: false }
  }

  static getDerivedStateFromError(): SceneBoundaryState {
    return { failed: true }
  }

  override componentDidCatch(error: unknown, info: ErrorInfo): void {
    this.props.onError?.(error, info)
  }

  override render(): ReactNode {
    // Deliberately one-way for the lifetime of the boundary: there is no automatic retry.
    // A scene that failed because WebGL is unavailable will fail again immediately, and a
    // boundary that retries turns one error into an infinite loop of them. Recovery is the
    // application's decision, made by remounting the boundary with a new `key`.
    return this.state.failed ? this.props.fallback : this.props.children
  }
}
