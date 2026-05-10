# Example: Global Modal Flow

Use this shape when a modal can be opened from more than one place in the app.

## 1. Register the ID

```ts
export const MODAL_IDS = {
  SUPPORT_REQUEST: "support-request",
} as const;
```

## 2. Open From Outside the Current Modal Stack

```tsx
"use client";

import { useModal } from "@/components/ui/modal/context";
import { MODAL_IDS } from "@/components/global/modals/ids";
import { SupportRequestModal } from "@/components/global/modals/support-request";

export function SupportRequestButton() {
  const { pushModal, show } = useModal();

  const openModal = () => {
    pushModal(
      {
        id: MODAL_IDS.SUPPORT_REQUEST,
        content: <SupportRequestModal />,
      },
      true,
    );
    show();
  };

  return <button onClick={openModal}>Contact support</button>;
}
```

## 3. Modal Body

```tsx
"use client";

import { useModal } from "@/components/ui/modal/context";
import {
  ModalContent,
  ModalDescription,
  ModalHeader,
  ModalTitle,
} from "@/components/ui/modal/modal";

export function SupportRequestModal() {
  const { hide, popModal, stack } = useModal();

  const handleClose = async () => {
    if (stack.length === 1) {
      await hide();
      popModal();
      return;
    }

    popModal();
  };

  return (
    <ModalContent>
      <ModalHeader backAction={stack.length > 1 ? handleClose : undefined}>
        <ModalTitle>Contact support</ModalTitle>
      </ModalHeader>
      <ModalDescription className="sr-only">
        Send a support request.
      </ModalDescription>
      {/* modal body */}
    </ModalContent>
  );
}
```

## Rules This Example Demonstrates

- Global modal IDs live in one file.
- Open from outside an existing stack with `pushModal(..., true)` and then `show()`.
- Close the final modal with `await hide(); popModal()`.
- Do not start from a raw `Dialog` or `Sheet` for app-level modals.
