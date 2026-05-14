import { create } from "zustand";
import { createJSONStorage, persist, type StateStorage } from "zustand/middleware";

type CartState = {
  /** Bumicert IDs in the cart (format: "{did}-{rkey}") */
  items: string[];
};

type CartActions = {
  addItem: (id: string) => void;
  removeItem: (id: string) => void;
  isInCart: (id: string) => boolean;
  clearCart: () => void;
};

const noopStorage: StateStorage = {
  getItem: () => null,
  setItem: () => undefined,
  removeItem: () => undefined,
};

const getCartStorage = (): StateStorage => {
  if (typeof window === "undefined") return noopStorage;

  const storage = window.localStorage;
  if (
    typeof storage.getItem !== "function" ||
    typeof storage.setItem !== "function" ||
    typeof storage.removeItem !== "function"
  ) {
    return noopStorage;
  }

  return storage;
};

export const useCartStore = create<CartState & CartActions>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (id) =>
        set((state) => ({
          items: state.items.includes(id) ? state.items : [...state.items, id],
        })),

      removeItem: (id) =>
        set((state) => ({
          items: state.items.filter((i) => i !== id),
        })),

      isInCart: (id) => get().items.includes(id),

      clearCart: () => set({ items: [] }),
    }),
    {
      name: "bumicerts-cart",
      storage: createJSONStorage(getCartStorage),
    }
  )
);
