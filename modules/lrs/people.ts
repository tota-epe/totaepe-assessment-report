type LRSAccount = {
  homePage: string,
  name: string
}
type LRSPersona = {
  name: string,
  account: LRSAccount,
}
type LRSPeople = {
  id: number,
  name: string,
  personas: LRSPersona[]
}
  
export const getLRSPeople = async () => {
  const authorization = Buffer.from(`${process.env.LRS_LOGIN}:${process.env.LRS_PASSWORD}`).toString('base64')
  const requestOptions = {
    method: 'GET',
    headers: new Headers({
      'Authorization': `Basic ${authorization}`
    })
  };

  // Fetch data from external API
  const res = await fetch('https://watershedlrs.com/api/organizations/15733/people?_limit=1000', requestOptions)
  const data = await res.json() as { results: { result: LRSPeople }[] }
  const totaepePeople = data.results.filter( person => person.personas[0]?.account?.homePage === 'https://totaepe.global')
  return totaepePeople.map(person => {
    return {
      id: person.id,
      name: person.name,
      acountName: person.personas[0].account.name,
    }
  })
}