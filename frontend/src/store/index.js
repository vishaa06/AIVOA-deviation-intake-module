import { configureStore } from '@reduxjs/toolkit'
import deviationReducer from './deviationSlice'
import aiReducer from './aiSlice'

export const store = configureStore({
  reducer: {
    deviation: deviationReducer,
    ai: aiReducer,
  },
})
