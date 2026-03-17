"use client"

import { useMemo, type AnchorHTMLAttributes, type HTMLAttributes, type ReactNode } from 'react'
import type { RichTextRecord, RichTextDisplayClassNames, MentionFeature, LinkFeature, TagFeature } from './types'
import { isMentionFeature, isLinkFeature, isTagFeature } from './types'
import { parseRichText } from './parser'

// ─── Render Prop Types ───────────────────────────────────────────────────────

export interface MentionProps {
  text: string
  did: string
  feature: MentionFeature
}

export interface LinkProps {
  text: string
  uri: string
  feature: LinkFeature
}

export interface TagProps {
  text: string
  tag: string
  feature: TagFeature
}

// ─── Component Props ─────────────────────────────────────────────────────────

export interface RichTextDisplayProps extends Omit<HTMLAttributes<HTMLSpanElement>, 'children'> {
  value: RichTextRecord | string
  renderMention?: (props: MentionProps) => ReactNode
  renderLink?: (props: LinkProps) => ReactNode
  renderTag?: (props: TagProps) => ReactNode
  disableLinks?: boolean
  linkProps?: AnchorHTMLAttributes<HTMLAnchorElement>
  classNames?: Partial<RichTextDisplayClassNames>
  mentionUrl?: (did: string) => string
  tagUrl?: (tag: string) => string
  linkUrl?: (uri: string) => string
}

// ─── Default Renderers ───────────────────────────────────────────────────────

function toShortUrl(url: string, maxLength = 30): string {
  try {
    const parsed = new URL(url)
    const host = parsed.hostname.replace(/^www\./, '')
    const rest = parsed.pathname + parsed.search + parsed.hash
    const full = host + (rest === '/' ? '' : rest)
    if (full.length <= maxLength) return full
    return full.slice(0, maxLength) + '…'
  } catch {
    return url
  }
}

function DefaultMention({
  text, did, mentionUrl: buildUrl, className, linkProps,
}: { text: string; did: string; mentionUrl?: (did: string) => string; className?: string; linkProps?: AnchorHTMLAttributes<HTMLAnchorElement> }) {
  const href = buildUrl ? buildUrl(did) : `https://bsky.app/profile/${did}`
  return (
    <a href={href} className={className} target="_blank" rel="noopener noreferrer" data-did={did} {...linkProps}>
      {text}
    </a>
  )
}

function DefaultLink({
  text, uri, linkUrl: buildUrl, className, linkProps,
}: { text: string; uri: string; linkUrl?: (uri: string) => string; className?: string; linkProps?: AnchorHTMLAttributes<HTMLAnchorElement> }) {
  const href = buildUrl ? buildUrl(uri) : uri
  return (
    <a href={href} className={className} target="_blank" rel="noopener noreferrer" {...linkProps}>
      {toShortUrl(text)}
    </a>
  )
}

function DefaultTag({
  text, tag, tagUrl: buildUrl, className, linkProps,
}: { text: string; tag: string; tagUrl?: (tag: string) => string; className?: string; linkProps?: AnchorHTMLAttributes<HTMLAnchorElement> }) {
  const href = buildUrl ? buildUrl(tag) : `https://bsky.app/hashtag/${encodeURIComponent(tag)}`
  return (
    <a href={href} className={className} target="_blank" rel="noopener noreferrer" data-tag={tag} {...linkProps}>
      {text}
    </a>
  )
}

// ─── Component ───────────────────────────────────────────────────────────────

export function RichTextDisplay({
  value,
  renderMention,
  renderLink,
  renderTag,
  disableLinks = false,
  linkProps,
  classNames,
  mentionUrl,
  tagUrl,
  linkUrl,
  ...spanProps
}: RichTextDisplayProps) {
  const record: RichTextRecord = typeof value === 'string' ? { text: value } : value

  const segments = useMemo(() => parseRichText(record), [record.text, record.facets])

  const children: ReactNode[] = segments.map((segment, index) => {
    const { text, feature } = segment
    if (!feature || disableLinks) return text

    if (isMentionFeature(feature)) {
      if (renderMention) {
        return <span key={index} className={classNames?.mention}>{renderMention({ text, did: feature.did, feature })}</span>
      }
      return (
        <DefaultMention
          key={index}
          text={text}
          did={feature.did}
          mentionUrl={mentionUrl}
          className={classNames?.mention}
          linkProps={linkProps}
        />
      )
    }

    if (isLinkFeature(feature)) {
      if (renderLink) {
        return <span key={index} className={classNames?.link}>{renderLink({ text, uri: feature.uri, feature })}</span>
      }
      return (
        <DefaultLink
          key={index}
          text={text}
          uri={feature.uri}
          linkUrl={linkUrl}
          className={classNames?.link}
          linkProps={linkProps}
        />
      )
    }

    if (isTagFeature(feature)) {
      if (renderTag) {
        return <span key={index} className={classNames?.tag}>{renderTag({ text, tag: feature.tag, feature })}</span>
      }
      return (
        <DefaultTag
          key={index}
          text={text}
          tag={feature.tag}
          tagUrl={tagUrl}
          className={classNames?.tag}
          linkProps={linkProps}
        />
      )
    }

    return text
  })

  return (
    <span className={classNames?.root} {...spanProps}>
      {children}
    </span>
  )
}
