type ComponentState = {
  _id: string,
  _extras: {
    words: string[],
    shuffle: boolean
  }
}

export type NodeState = {
  _id: string,
  _isComplete?: boolean,
  _isInteractionComplete?: boolean,
  letter?: string,
  nodeScore?: number,
  lastInteraction?: string,
  superMemo?: {
    interval: number,
    repetition: number,
    efactor: number,
    lastStatement?: string
  }
  resultData: any
}

export type CourseState = {
  _id?: string,
  _startId?: string,
  _lxpMaestroTimestamp?: string,
  currentMainNodeId?: string
}

export const getCourseState = async (accountName: string) => {
  const res = await fetch(LRSStateURL(accountName, 'course').toString(), requestOptions())
  return await res.json() as CourseState
}

export const getNodeStates = async (accountName: string) => {
  const res = await fetch(LRSStateURL(accountName, 'contentObjects').toString(), requestOptions())
  return await res.json() as NodeState[]
}

export const getComponentState = async (accountName: string) => {
  const res = await fetch(LRSStateURL(accountName, 'components').toString(), requestOptions())
  return await res.json() as ComponentState[]
}

export const updateNodeStates = async (accountName: string, newState: NodeState | NodeState[] ) => {
  let nodeStates = await getNodeStates(accountName)

  if (!Array.isArray(newState)) {
    newState = [newState] as NodeState[]
  }
  newState.forEach(state => {
    let currentNodeState = nodeStates.find(c => c._id === state._id)
    if (!currentNodeState) {
      nodeStates.push(state)
    } else {
      Object.assign(currentNodeState, state);
    }
  });

  let requestOptionsPut = {
    ...requestOptions(),
    method: 'PUT',
    body: JSON.stringify(nodeStates)
  }
  requestOptionsPut.headers.set('Content-Type', 'application/json')

  await fetch(LRSStateURL(accountName, 'contentObjects').toString(), requestOptionsPut)
  return nodeStates
}

export const updateComponentState = async (accountName: string, newState: ComponentState) => {
  let componentState = await getComponentState(accountName)
  let currentComponentState = componentState.find(c => c._id === newState._id)
  if (!currentComponentState) {
    componentState.push(newState)
  } else {
    Object.assign(currentComponentState, newState);
  }

  let requestOptionsPut = {
    ...requestOptions(),
    method: 'PUT',
    body: JSON.stringify(componentState)
  }
  requestOptionsPut.headers.set('Content-Type', 'application/json')

  return await fetch(LRSStateURL(accountName, 'components').toString(), requestOptionsPut)
}

export const updateCourseState = async (accountName: string, newState: CourseState) => {
  let courseState = await getCourseState(accountName)
  let currentCourseState = {
    ...courseState,
    ...newState,
    _id: 'course',
    _lxpMaestroTimestamp: Date()
  }

  let requestOptionsPut = {
    ...requestOptions(),
    method: 'PUT',
    body: JSON.stringify(currentCourseState)
  }
  requestOptionsPut.headers.set('Content-Type', 'application/json')

  const res = await fetch(LRSStateURL(accountName, 'course').toString(), requestOptionsPut)
}

const requestOptions = () => {
  const authorization = Buffer.from(`${process.env.LRS_MAESTRO_LOGIN}:${process.env.LRS_MAESTRO_PASSWORD}`).toString('base64')
  return {
    method: 'GET',
    headers: new Headers({
      'X-Experience-API-Version': '1.0.1',
      'Authorization': `Basic ${authorization}`
    })
  }
}

const LRSStateURL = (accountName: string, stateId: string) => {
  let url = new URL('https://watershedlrs.com/api/organizations/15733/lrs/activities/state')
  let agent = {
    objectType: 'Agent',
    account: {
      homePage: 'https://totaepe.global',
      name: accountName
    }
  }

  // Maria Ines has a user tied to cloud.scorm
  if (accountName === '2BNE75KTBT|teste_ninoca@mailinator.com') {
    agent.account.homePage = 'http://cloud.scorm.com';
  }

  url.search = new URLSearchParams({
    activityId: 'https://tota-app.lxp.io',
    stateId: stateId,
    agent: JSON.stringify(agent)
  }).toString()

  return url
}