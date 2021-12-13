type ComponentState = {
  _id: string,
  _extras: {
    words: string[],
    shuffle: boolean
  }
}

type CourseState = {
  _id?: string,
  _startId: string
}

export const getCourseState = async () => {
  const res = await fetch(LRSStateURL('course').toString(), requestOptions())
  return await res.json() as CourseState
}

export const getComponentState = async () => {
  const res = await fetch(LRSStateURL('components').toString(), requestOptions())
  return await res.json() as ComponentState[]
}

export const updateComponentState = async (newState: ComponentState) => {
  let componentState = await getComponentState()
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

  const res = await fetch(LRSStateURL('components').toString(), requestOptionsPut)
}

export const updateCourseState = async (newState: CourseState) => {
  let courseState = await getCourseState()
  let currentCourseState = {
    ...courseState,
    ...newState
  }

  let requestOptionsPut = {
    ...requestOptions(),
    method: 'PUT',
    body: JSON.stringify(currentCourseState)
  }
  requestOptionsPut.headers.set('Content-Type', 'application/json')

  const res = await fetch(LRSStateURL('course').toString(), requestOptionsPut)
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

const LRSStateURL = (stateId: string) => {
  let url = new URL('https://watershedlrs.com/api/organizations/15733/lrs/activities/state')
  let agent = {
    objectType: 'Agent',
    account: {
      homePage: 'http://cloud.scorm.com',
      // name: '2BNE75KTBT|rmello@gmail.com'
      name: '2BNE75KTBT|teste_ninoca@mailinator.com'
    }
  }
  url.search = new URLSearchParams({
    activityId: 'https://tota-app.lxp.io',
    stateId: stateId,
    agent: JSON.stringify(agent)
  }).toString()

  return url
}