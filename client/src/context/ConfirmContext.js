import { createContext, useContext } from "react";

export const ConfirmContext = createContext(() => Promise.resolve(window.confirm("Are you sure?")));

// const confirm = useConfirm();
// if (await confirm({ title: "Delete property?", message: "…", confirmText: "Delete", tone: "danger" })) { … }
export const useConfirm = () => useContext(ConfirmContext);
