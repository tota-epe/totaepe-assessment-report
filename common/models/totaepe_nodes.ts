import courseComponents from '../components.json'

export type Node = {
  id: string,
  title: string,
  concepts?: { [key: string]: string},
  words: { word: string, conceptRange: string }[]
}

export const nodes: Node[] = courseComponents.map(component => {
  return {
    id: component._id,
    title: component.title,
    concepts: component._concepts,
    words: component._words
  }
})
