import { mainNodes } from "../common/models/totaepe_nodes";
const http = require("http");

const accountName = "2BNE75KTBT|teste_ninoca@mailinator.com";
// const accountName = 'guiomar.albuquerque@ufes.br';

function processNode(nodeId: string) {
  return new Promise((resolve, reject) => {
    const nodeUpdateURL = `http://127.0.0.1:3000/api/${accountName}/maestro?nodeID=${nodeId}`;
    let requestOptions = {
      method: "POST",
    };
    const req = http.request(nodeUpdateURL, requestOptions, (res: any) => {
      res.setEncoding("utf8");
      res.on("end", () => {
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
    const nodeUpdateURL = `http://127.0.0.1:3000/api/${accountName}/maestro?nodeID=${element._id}`;
    console.log(element.title, element._id, nodeUpdateURL);
    await processNode(element._id);
  }
};

processNodes();
