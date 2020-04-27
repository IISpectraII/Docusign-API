/**
 * This is a quick start example of creating and sending an envelope to be signed. 
 * Language: Node.js
 * 
 * See the Readme and Setup files for more information.
 * 
 * Copyright (c) DocuSign, Inc.
 * License: MIT Licence. See the LICENSE file.
 * 
 * This example does not include authentication. Instead, an access token
 * must be supplied from the Token Generator tool on the DevCenter or from
 * elsewhere.
 * 
 * This example also does not look up the DocuSign account id to be used.
 * Instead, the account id must be set. 
 * 
 * For a more production oriented example, see:
 *   JWT authentication: https://github.com/docusign/eg-01-node-jwt 
 *   or Authorization code grant authentication. Includes express web app:
 *      https://github.com/docusign/eg-03-node-auth-code-grant 
 * @file index.js
 * @author DocuSign
 * @modified Geovanny González
 * @see <a href="https://developers.docusign.com">DocuSign Developer Center</a>
 */
const docusign = require('docusign-esign')
    , path = require('path')
    , fs = require('fs')
    , process = require('process')
    , basePath = 'https://demo.docusign.net/restapi'
    , express = require('express')
    , envir = process.env
    ;

/**
 * Añadir el siguiente contenido a package.json para obtener los paquetes.
 * Instalan con "npm i"
 * "dependencies": {
    "docusign-esign": "^5.1.0",
    "express": "^4.17.1",
    "fs": "0.0.1-security",
    "moment": "^2.24.0"
  }
 */

//Formato del parametro data
let data = {
  accessToken: '', //Token para consumir el API
  accountId: '', //Cuenta del usuario que posee el servicio
  signerName: '', //Nombre de la persona que firma 
  signerEmail: '', //Email de la persona
  pathPDF: '/home/geovanny/Descargas/Taller 13B - Analisis Forense de Móviles.pdf', //Ruta al archivo
  documentSubject: 'Please sign this document sent from the Node example', //Descripción para firmar en el API
  documentName: 'PDF Test', //Nombre del documento
  xSignPosition: 1, //Posición en X para el archivo de firma
  ySignPosition: 1, //Posicion en Y para el archivo
};

//Permite crear una petición de firma para un documento en PDF
//@param data Obtiene la información para consumir el API de Docusign 
export default async function sendDocument (data) {
  const qp =req.query;
  // Fill in these constants or use query parameters of ACCESS_TOKEN, ACCOUNT_ID, USER_FULLNAME, USER_EMAIL
  // or environment variables.

  // Obtain an OAuth token from https://developers.docusign.com/oauth-token-generator
  const accessToken = envir.ACCESS_TOKEN || qp.ACCESS_TOKEN || data.accessToken;

  // Obtain your accountId from demo.docusign.com -- the account id is shown in the drop down on the
  // upper right corner of the screen by your picture or the default picture. 
  const accountId = envir.ACCOUNT_ID || qp.ACCOUNT_ID || data.accountId; 

  // Recipient Information:
  const signerName = envir.USER_FULLNAME || qp.USER_FULLNAME || data.signerName;
  const signerEmail = envir.USER_EMAIL || qp.USER_EMAIL || data.signerEmail;

  // The document you wish to send. Path is relative to the root directory of this repo.
  const fileName = data.pathPDF;

  ////////////////////////////////////////////////////////////////////////////////
  ////////////////////////////////////////////////////////////////////////////////

  /**
   *  The envelope is sent to the provided email address. 
   *  One signHere tab is added.
   *  The document path supplied is relative to the working directory 
   */
  const apiClient = new docusign.ApiClient();
  apiClient.setBasePath(basePath);
  apiClient.addDefaultHeader('Authorization', 'Bearer ' + accessToken);
  // Set the DocuSign SDK components to use the apiClient object
  docusign.Configuration.default.setDefaultApiClient(apiClient);

  // Create the envelope request
  // Start with the request object
  const envDef = new docusign.EnvelopeDefinition();
  //Set the Email Subject line and email message
  envDef.emailSubject = data.documentSubject;
  envDef.emailBlurb = data.documentSubject;

  // Read the file from the document and convert it to a Base64String
  //Si necesitan una ruta relativa agregen el parametro __dirName a path.resolve, el sabe como mapear.
  const pdfBytes = fs.readFileSync(path.resolve(fileName))
      , pdfBase64 = pdfBytes.toString('base64');
  
  // Create the document request object
  const doc = docusign.Document.constructFromObject({documentBase64: pdfBase64,
        fileExtension: 'pdf',  // You can send other types of documents too.
        name: data.documentName, documentId: '1'});

  // Create a documents object array for the envelope definition and add the doc object
  envDef.documents = [doc];

  // Create the signer object with the previously provided name / email address
  const signer = docusign.Signer.constructFromObject({name: signerName,
        email: signerEmail, routingOrder: '1', recipientId: '1'});

  // Create the signHere tab to be placed on the envelope
  const signHere = docusign.SignHere.constructFromObject({documentId: '1',
        pageNumber: '1', recipientId: '1', tabLabel: 'SignHereTab',
        xPosition: data.xSignPosition, yPosition: ySignPosition});

  // Create the overall tabs object for the signer and add the signHere tabs array
  // Note that tabs are relative to receipients/signers.
  signer.tabs = docusign.Tabs.constructFromObject({signHereTabs: [signHere]});

  // Add the recipients object to the envelope definition.
  // It includes an array of the signer objects. 
  envDef.recipients = docusign.Recipients.constructFromObject({signers: [signer]});
  // Set the Envelope status. For drafts, use 'created' To send the envelope right away, use 'sent'
  envDef.status = 'sent';

  // Send the envelope
  let envelopesApi = new docusign.EnvelopesApi()
    , results
    ;

  try {
    results = await envelopesApi.createEnvelope(accountId, {'envelopeDefinition': envDef})
  } catch  (e) {
    let body = e.response && e.response.body;
    if (body) {
      // DocuSign API exception
      return {
        title: 'Error Fatal',
        status: e.response.status,
        message: JSON.stringify(body,null, 4)
      };      
    } else {
      // Not a DocuSign exception, Error Fatal de la aplicación que consume
      throw e;
    }
  }
  // Envelope has been created: Peticion creada en el sistema para ser validada
  if (results) {
    return {
      title: 'Petición creada',
      signer: `${signerName} - ${signerEmail}`
    }    
  }
}