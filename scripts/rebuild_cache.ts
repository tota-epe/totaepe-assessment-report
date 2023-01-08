import { mainNodes, letterNodes } from "../common/models/totaepe_nodes";
const http = require("http");

function processNode(nodeId: string) {
  return new Promise((resolve, reject) => {
    const nodeUpdateURL = `http://127.0.0.1:3000/api/2BNE75KTBT|teste_ninoca@mailinator.com/maestro?nodeID=${nodeId}`;
    let requestOptions = {
      method: "POST",
    };
    const req = http.request(nodeUpdateURL, requestOptions, (res: any) => {
      // console.log(`STATUS: ${res.statusCode}`);
      // console.log(`HEADERS: ${JSON.stringify(res.headers)}`);
      res.setEncoding("utf8");
      res.on("data", (chunk: any) => {
        // console.log(`BODY: ${chunk}`);
      });
      res.on("end", () => {
        console.log("No more data in response.");
        resolve(nodeId);
      });
    });

    req.on("error", (e: any) => {
      console.error(`problem with request: ${e.message}`);
    });

    req.end();
  });
}

const processNodes = async () => {
  for (let index = 0; index < mainNodes.length; index++) {
    const element = mainNodes[index];
    const nodeUpdateURL = `http://127.0.0.1:3000/api/2BNE75KTBT|teste_ninoca@mailinator.com/maestro?nodeID=${element._id}`;
    console.log(element.title, element._id, nodeUpdateURL);
    await processNode(element._id);
  }
};

processNodes();
