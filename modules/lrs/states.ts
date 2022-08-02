type ComponentState = {
  _id: string,
  _extras: {
    words: string[],
    shuffle: boolean
  }
}

type CourseState = {
  _id?: string,
  _startId: string,
  _lxpMaestroTimestamp?: string
}

export const getCourseState = async (accountName: string) => {
  const res = await fetch(LRSStateURL(accountName, 'course').toString(), requestOptions())
  return await res.json() as CourseState
}

export const getComponentState = async (accountName: string) => {
  const res = await fetch(LRSStateURL(accountName, 'components').toString(), requestOptions())
  return await res.json() as ComponentState[]
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
    _id: 'course'
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
  url.search = new URLSearchParams({
    activityId: 'https://tota-app.lxp.io',
    stateId: stateId,
    agent: JSON.stringify(agent)
  }).toString()

  return url
}