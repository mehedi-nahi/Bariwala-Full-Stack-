import { createContext, useContext } from "react";

export const CartContext = createContext({
    items: [], count: 0, total: 0, has: () => false,
    add: () => false, remove: () => {}, clear: () => {}, open: () => {}, close: () => {},
});

export const useCart = () => useContext(CartContext);
