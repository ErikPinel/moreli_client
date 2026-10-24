import Fuse from 'fuse.js'
import { Check, ChevronDown, X } from 'lucide-react'
import { type KeyboardEvent, type ReactNode, useEffect, useId, useMemo, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

export type SearchOption = {
  id: string | number
  label: string
  hint?: string
  indent?: boolean
}

type SearchComboboxProps = {
  label: string
  placeholder: string
  icon: ReactNode
  options: SearchOption[]
  value: SearchOption | null
  onChange: (value: SearchOption | null) => void
  isLoading?: boolean
  variant?: 'hero' | 'field'
  className?: string
  selectedOptions?: SearchOption[]
  onRemove?: (id: SearchOption['id']) => void
  'aria-invalid'?: boolean
  'aria-describedby'?: string
  onBlur?: () => void
}

export function SearchCombobox({
  label,
  placeholder,
  icon,
  options,
  value,
  onChange,
  isLoading,
  variant = 'hero',
  className,
  selectedOptions,
  onRemove,
  'aria-invalid': invalid,
  'aria-describedby': describedBy,
  onBlur,
}: SearchComboboxProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const inputId = useId()
  const listId = useId()
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const resultLimit = useResponsiveResultLimit()
  const fuse = useMemo(
    () =>
      new Fuse(options, {
        keys: [{ name: 'label', weight: 0.85 }, { name: 'hint', weight: 0.15 }],
        threshold: 0.38,
        distance: 80,
        ignoreLocation: true,
        minMatchCharLength: 1,
      }),
    [options],
  )
  const visibleOptions = useMemo(() => {
    const normalizedQuery = query.trim()
    const matches = normalizedQuery
      ? fuse.search(normalizedQuery).map((result) => result.item)
      : options
    return matches.slice(0, resultLimit)
  }, [fuse, options, query, resultLimit])

  function choose(option: SearchOption) {
    onChange(option)
    setQuery('')
    setIsOpen(Boolean(selectedOptions))
    setActiveIndex(0)
    inputRef.current?.focus()
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Backspace' && !query && selectedOptions?.length) {
      onRemove?.(selectedOptions[selectedOptions.length - 1].id)
    }
    if (event.key === 'Escape') {
      setIsOpen(false)
      return
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      setIsOpen(true)
      const direction = event.key === 'ArrowDown' ? 1 : -1
      setActiveIndex((current) => {
        const count = visibleOptions.length
        return count ? (current + direction + count) % count : 0
      })
      return
    }
    if (event.key === 'Enter' && isOpen) {
      event.preventDefault()
      if (visibleOptions[activeIndex]) choose(visibleOptions[activeIndex])
    }
  }

  return (
    <div
      className={cn(
        'search-combobox',
        variant === 'field' && 'search-combobox--field',
        selectedOptions && 'search-combobox--multiple',
        className,
      )}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setIsOpen(false)
          onBlur?.()
        }
      }}
    >
      <label className="sr-only" htmlFor={inputId}>
        {label}
      </label>
      <div className="search-combobox__control">
        <span className="search-combobox__icon" aria-hidden="true">
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <span className="search-combobox__label">{label}</span>
          <div className={selectedOptions ? 'catalog-chip-input' : undefined}>
          {selectedOptions?.map((option) => <span className="catalog-chip" key={option.id}>
            <span>{option.label}</span>
            <button type="button" aria-label={`הסרת ${option.label}`} title={`הסרת ${option.label}`} onClick={() => { onRemove?.(option.id); inputRef.current?.focus() }}><X aria-hidden="true" /></button>
          </span>)}
          <input
            ref={inputRef}
            id={inputId}
            role="combobox"
            aria-autocomplete="list"
            aria-invalid={invalid}
            aria-describedby={describedBy}
            aria-controls={listId}
            aria-expanded={isOpen}
            aria-activedescendant={
              isOpen && visibleOptions[activeIndex]
                ? `${listId}-option-${activeIndex}`
                : undefined
            }
            autoComplete="off"
            className="search-combobox__input"
            placeholder={placeholder}
            value={isOpen ? query : (value?.label ?? '')}
            onChange={(event) => {
              setQuery(event.target.value)
              onChange(null)
              setIsOpen(true)
              setActiveIndex(0)
            }}
            onFocus={() => {
              setQuery('')
              setIsOpen(true)
              setActiveIndex(0)
            }}
            onKeyDown={handleKeyDown}
          />
          </div>
        </div>
        {value ? (
          <button
            type="button"
            className="search-combobox__clear"
            aria-label={`ניקוי ${label}`}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => {
              onChange(null)
              setQuery('')
              setIsOpen(false)
            }}
          >
            <X aria-hidden="true" />
          </button>
        ) : null}
        <ChevronDown className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      </div>

      {isOpen ? (
        <div
          id={listId}
          role="listbox"
          className="search-combobox__results"
        >
          {isLoading ? (
            <p className="px-3 py-4 text-sm text-muted-foreground">טוען אפשרויות...</p>
          ) : visibleOptions.length ? (
            visibleOptions.map((option, index) => (
              <button
                key={option.id}
                id={`${listId}-option-${index}`}
                type="button"
                role="option"
                aria-selected={value?.id === option.id}
                className={cn(
                  'search-combobox__option',
                  option.indent && 'is-indented',
                )}
                data-active={activeIndex === index || undefined}
                onMouseEnter={() => setActiveIndex(index)}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => choose(option)}
              >
                <Check
                  className={cn(
                    'size-4 text-primary',
                    value?.id !== option.id && 'opacity-0',
                  )}
                  aria-hidden="true"
                />
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold">{option.label}</span>
                  {option.hint ? (
                    <span className="block text-xs text-muted-foreground">{option.hint}</span>
                  ) : null}
                </span>
              </button>
            ))
          ) : (
            <p className="px-3 py-4 text-sm text-muted-foreground">לא מצאנו התאמה.</p>
          )}
        </div>
      ) : null}
    </div>
  )
}

function useResponsiveResultLimit() {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window === 'undefined' ? false : window.matchMedia('(max-width: 767px)').matches,
  )

  useEffect(() => {
    const media = window.matchMedia('(max-width: 767px)')
    const update = () => setIsMobile(media.matches)
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])

  return isMobile ? 5 : 8
}