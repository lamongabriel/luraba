"use client"

import * as React from "react"

export interface UseDisclosureReturn {
  isOpen: boolean
  onOpen: () => void
  onClose: () => void
  onToggle: () => void
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>
}

/**
 * Basic open/close boolean state, for dialogs, sheets, popovers, etc.
 *
 *   const { isOpen, onOpen, onClose } = useDisclosure()
 */
export function useDisclosure(defaultIsOpen = false): UseDisclosureReturn {
  const [isOpen, setIsOpen] = React.useState(defaultIsOpen)

  const onOpen = React.useCallback(() => setIsOpen(true), [])
  const onClose = React.useCallback(() => setIsOpen(false), [])
  const onToggle = React.useCallback(() => setIsOpen((value) => !value), [])

  return { isOpen, onOpen, onClose, onToggle, setIsOpen }
}

export interface UseEntityDisclosureReturn<TEntity>
  extends UseDisclosureReturn {
  /** The entity being created/edited/deleted. `undefined` means "create new". */
  entity: TEntity | undefined
  /** Opens the disclosure for creating a new entity (clears `entity`). */
  onCreate: () => void
  /** Opens the disclosure for an existing entity. */
  onEdit: (entity: TEntity) => void
}

/**
 * Like `useDisclosure`, but also tracks an optional "current entity" — the
 * common create/edit/delete-sheet-or-modal pattern used across list pages
 * (e.g. categories, tags):
 *
 *   const createEdit = useEntityDisclosure<Category>()
 *   const deleteDisclosure = useEntityDisclosure<Category>()
 *
 *   <CategorySheet
 *     open={createEdit.isOpen}
 *     onOpenChange={createEdit.setIsOpen}
 *     category={createEdit.entity}
 *   />
 *   <DeleteCategoryModal
 *     open={deleteDisclosure.isOpen}
 *     onOpenChange={deleteDisclosure.setIsOpen}
 *     category={deleteDisclosure.entity}
 *   />
 *
 *   onClick={createEdit.onCreate}          // new category
 *   onClick={() => createEdit.onEdit(row)} // edit existing
 *   onClick={() => deleteDisclosure.onEdit(row)} // "delete this one"
 */
export function useEntityDisclosure<
  TEntity,
>(): UseEntityDisclosureReturn<TEntity> {
  const disclosure = useDisclosure()
  const [entity, setEntity] = React.useState<TEntity | undefined>(undefined)

  const onCreate = React.useCallback(() => {
    setEntity(undefined)
    disclosure.onOpen()
  }, [disclosure])

  const onEdit = React.useCallback(
    (nextEntity: TEntity) => {
      setEntity(nextEntity)
      disclosure.onOpen()
    },
    [disclosure],
  )

  return { ...disclosure, entity, onCreate, onEdit }
}
