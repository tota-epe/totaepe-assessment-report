import courseComponents from '../course/en/components.json'
import courseBlocks from '../course/en/blocks.json'
import courseArticles from '../course/en/articles.json'
import courseContentObjects from '../course/en/contentObjects.json'

export const nodeTransitons = {
  '615e01943f71e3dffca2c70c': '61606f3c3f71e3dffca2c710',
  '61606f3c3f71e3dffca2c710': '616070a13f71e3dffca2c714'
}

export type Node = {
  id: string,
  title: string,
  _parentId: string,
  concepts?: { [key: string]: string},
  words: { word: string, conceptRange: string }[]
}

export const idMap: { [key: string]: string[] } = {
  // Nodes
  '615368803f71e3dffca2c6ec': ['60708e3007adda001d321d23'],
  '615368803f71e3dffca2c6ed': ['60b4f28af37db9001d572b1e'],
  '615368803f71e3dffca2c6ee': ['60cb81b812f81a001c4cc4cd'],
  '615368803f71e3dffca2c6ef': ['60e8ac250dd55b001dad4b7e'],
  '615368803f71e3dffca2c6f0': ['611535ff1eeab3001d453419'],
  '615368803f71e3dffca2c6f1': ['612aadbd953f33001d87d9dc'],
  '615368803f71e3dffca2c6f2': ['613a4ea666c91b001c5fc48c'],
  '615368803f71e3dffca2c6f3': ['6140f886b92f5e001dfe4ea7'],
  '615e01943f71e3dffca2c70c': ['61570b3667d1f7001c4710cc'],

  // Components
  '615368803f71e3dffca2c704': ['60708e5e07adda001d321d27'],
  '615368803f71e3dffca2c705': ['60b4f2bef37db9001d572b22'],
  '615368813f71e3dffca2c706': ['60cb81cd12f81a001c4cc4d0'],
  '615368813f71e3dffca2c707': ['60e8ac860dd55b001dad4b82'],
  '615368813f71e3dffca2c708': ['611536171eeab3001d45341c'],
  '615368813f71e3dffca2c709': ['612aadd9953f33001d87d9df'],
  '615368813f71e3dffca2c70a': ['613a4ebc66c91b001c5fc48f'],
  '615368813f71e3dffca2c70b': ['6140f8a0b92f5e001dfe4eaa'],
  '615e01b43f71e3dffca2c70f': ['61570b4267d1f7001c4710cf']
}

export const components: Node[] = courseComponents.map(component => {
  return {
    id: component._id,
    title: component.title,
    _parentId: component._parentId,
    concepts: component._concepts,
    words: component._words
  }
})

export const blocks = courseBlocks.map(block => {
  return {
    components: components.filter(component => component._parentId === block._id),
    ...block
  }
})

export const articles = courseArticles.map(article => {
  return {
    blocks: blocks.filter(block => block._parentId === article._id),
    ...article
  }
})

export const nodes = courseContentObjects.map(contentObject => {
  return {
    articles: articles.filter(article => article._parentId === contentObject._id),
    ...contentObject
  }
})
