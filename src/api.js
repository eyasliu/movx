// import { normalizeNamespace } from './helper'
import { MAP_STATE_FIELD, MAP_ACTION_FIELD } from './helper'

export const mapState = opt => {
  return {
    [MAP_STATE_FIELD]: opt
  }
}

export const mapAction = opt => {
  return {
    [MAP_ACTION_FIELD]: opt
  }
}
