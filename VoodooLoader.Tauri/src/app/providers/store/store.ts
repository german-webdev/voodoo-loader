import { configureStore } from "@reduxjs/toolkit";
import { downloaderSlice } from "../../../pages/downloader/model/store/downloaderSlice";

export const store = configureStore({
  reducer: {
    downloader: downloaderSlice.reducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
