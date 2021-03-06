/*******************************************************************************
 *  Copyright 2009 Apstrata
 *  
 *  This file is part of Apstrata Database Javascript Client.
 *  
 *  Apstrata Database Javascript Client is free software: you can redistribute it
 *  and/or modify it under the terms of the GNU Lesser General Public License as
 *  published by the Free Software Foundation, either version 3 of the License,
 *  or (at your option) any later version.
 *  
 *  Apstrata Database Javascript Client is distributed in the hope that it will be
 *  useful, but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU Lesser General Public License for more details.
 *  
 *  You should have received a copy of the GNU Lesser General Public License
 *  along with Apstrata Database Javascript Client.  If not, see <http://www.gnu.org/licenses/>.
 * *****************************************************************************
 */

dojo.provide('apstrata.Post');

dojo.require('dojo.io.iframe');
dojo.require('dojox.encoding.digests.MD5');
dojo.require('apstrata.Operation');

/**
 * Base class used as an abstract class for all other APIs
 * @class apstrata.apsdb.client.Get
*/
dojo.declare("apstrata.Post",
[apstrata.Operation],
	{
		execute: function(attrs) {
			var self = this;
			
			this.request = attrs.request
			
			// Send debug information to connection object, could be used later to identify problems
			self.log.info("Operation", self.apsdbOperation);
		
			this.request.apsws = {}
			this.request.apsws.callback = "apstrataSaveDocumentCallback" + Math.floor(Math.random()*10000)

			//Fixing a permission denied error when accessing parent window callback in the hidden iframe domain.com is opened instead of www.domain.com
			var baseUrl = apstrata.baseUrl;
			var isAccessControlAllowOrigin = false;
			if (apstrata.apConfig.config.accessControlAllowOrigin && (!dojo.isIE || dojo.isIE >=10)) // this new header is not supported in older IE versions
				isAccessControlAllowOrigin = true;
			if (window.location.href.indexOf("www.") == -1)
				baseUrl = apstrata.baseUrl.replace("www.","");
			if (attrs.redirectHref) this.request.apsws.redirectHref = attrs.redirectHref;
			else this.request.apsws.redirectHref = baseUrl + "/resources/PostIframeHandler.html"
			// This is a temporary fix for the P3P compact policy IE (should be removed asap) 
			if (this.apsdbOperation == "RunScript" && this.request["apsdb.scriptName"] == "VerifyCredentials" && (this.request["apsdb.action"] == "renew" || this.request["apsdb.action"] == "generate")) {
				this.request["renewCallback"] = this.request.apsws.callback;
				this.request["renewRedirectHref"] = this.request.apsws.redirectHref;
			}


			// ADD a dynamic callback that will be invoked by the code in PostIframeHandler.html
			window[this.request.apsws.callback] = function(jsonStr) {
				var jsonObj = dojo.fromJson(jsonStr);
				self.rawResponse = dojo.toJson(jsonObj, true) //format the response and properly indent it
				self.responseTime = (new Date().getTime()) - self._timestamp
		
					self.log.info("response object", jsonObj);

					self.log.debug("response time (ms)", self.responseTime);
					if (self.operationAborted) self.log.debug("POST Aborted");
					if (self.operationTimeout) self.log.error("POST Timed out");
		
				// Clear the timeout since we received a response from apstrata
				self._clearTimeout();

                if (jsonObj.response) {
					self.response = jsonObj.response
					
					self.log.info("requestId", self.response.metadata.requestId)
                    self.log.info("status", self.response.metadata.status);

                    if (self.response.metadata.status==self._SUCCESS) {
                        self.handleResult();
                    } else {
                        self.handleError();
                    }
                } else {
					// TODO: test case for bad response
                    self.response.metadata.status = "failure";
                    self.response.metadata.errorCode = "CLIENT_BAD_RESPONSE"
                    self.response.metadata.errorDetail = "apsdb client: bad response from apsdb or communication error"
                    self.log.error("errorDetail", self.errorMessage);
                    self.handleError();                                        
                }
				
				dojo.publish("/apstrata/operation", [{
						id: self.operationId,
						method: 'POST',
						type: "message",
						success: self.response.metadata.status,
						response: dojo.toJson(self.response),
						message: dojo.toJson(self.response)
				}])
			} 

			self._timestamp = new Date().getTime();
    
			// Since the hack for JSONP doesn't really allow for communication errors to be caught,
			//  we're using a timeout event to provide an error message if an operation takes too long to execute
			self.setTimeout()

			// Force the response status to always be 200 even on error when we are on an IE browser, making a
			// POST request, and the connection configuration for this parameter is set to allow sending it.
			var isForce200ResponseStatus = false;
			if (dojo.isIE && self.connection.isForce200ResponseStatusOnPOSTRequestsInIE) {
				isForce200ResponseStatus = true;
			}
                        self.url = self.buildActionUrl("json", isForce200ResponseStatus)

			var message = self.url

			// 1. Attempt to use the form node from the attributes.
			var formNode = attrs.formNode;
			if (formNode) {
				if (dijit.byId(attrs.formNode.id)) {
					var fields = dijit.byId(attrs.formNode.id).getValues()
					message += "<br>" 
					for (k in fields) {
						message += "<br>" + k + ":" + fields[k] 
					}
				}
			}
			// 2. In case the attributes did not contain a form node, then use the generic form node because
			// dojo.io.iframe only makes a POST request when there is a form, otherwise, it makes a GET request.
			else {
				var formId = 'apstrataGenericForm';
				if (dojo.isSafari && dojo.isSafari >= 6) {
					formId += Math.floor(Math.random() * 1000000);
				}
				formNode = document.getElementById(formId);
				if (formNode == null) {
					formNode = document.createElement('FORM');
					formNode.method = "post";
					// TODO We might want the enctype to be configurable in the request, but multipart forms work with or without files.
					formNode.enctype = "multipart/form-data";
					formNode.id = formId;

					// We need to append the form to the document or it will not be valid.
					document.body.appendChild(formNode);
				}
			}
			
			// in case the externally published function fails log the error and continue with the actual call
			try {
				dojo.publish("/apstrata/operation", [{
						id: self.operationId,
						method: 'POST',
						type: "message", 
						url: self.url,
						message: message
				}])
			} catch (err) {
				self.log.error("error in POST", err);				
			}
			
			self.log.debug("action url", self.url)
			var rqObj = self.buildRequestObject();
			self.log.debug("request object", rqObj)
			
			var hasFiles = false;
      // detect if the form being submitted contains files, proceed in the older way cause of xhrPost not passing files sources   
			if (isAccessControlAllowOrigin) { 
				for(var h in formNode) {
					if (formNode[h] && formNode[h].type == "file") {
						hasFiles = true;
					} else { 
						for (var hh in formNode[h]) {
							if (hh == "files" && formNode[h][hh] && formNode[h][hh].length > 0) {
								hasFiles = true;
								break;
							}
						}
					}
					if (hasFiles) break;
				}
			}
			
			var callAttrs = {
				// The target URL on your webserver:
				url: self.url,
				
				// The HTTP method to use:
				method: "post",
				
				form: formNode,
				
				// the content to submit:
				content: rqObj,
				
				// Callback on successful call:
				load: function(response, ioArgs) {
					// Remove the post form on Safari 6 since we create one on every POST.
					if (isAccessControlAllowOrigin && !hasFiles) {
						self.response = response.response;
					}
					if (dojo.isSafari && dojo.isSafari >= 6) {
						formNode.parentNode.removeChild(formNode);
					}

					self.rawResponse = dojo.toJson(self.response, true)
					self.responseTime = (new Date().getTime()) - self._timestamp;
					//self.connection.registerConnectionTime(self.responseTime)
					self.log.info("response time (ms)", self.responseTime);

					// Clear the timeout since we received a response from apstrata.
					self._clearTimeout();

					// we can't do a real abort or timeout operation
					// we're just using a flag to artificially ignore the result if the user requests an abort
					// or if after a timeout, a response was received anyway
					if (self.operationAborted) self.log.info("Aborted", self.operationAborted);
					if (self.operationTimeout) self.log.warn("Timed out", self.operationTimeout);

					// Here we know that apstrata has responded
					// The callback will handle parsing the response and calling proper handlers
					if (self.response && self.response.metadata && self.response.metadata.status == 'success') {
						self.handleResult();
					} else {
						// Could only reach this point on IE and not on any other browser because we would have
						// forced the response status to be 200 even on a failed request.
						self.handleError();
					}
				},
				
				// Callback on errors. This function will NOT get called on IE since we force the response status to be 200 on IE.
				error: function(response, ioArgs){
          if (isAccessControlAllowOrigin && !hasFiles && response.responseText) {
            self.response = JSON.parse(response.responseText).response;
          }
					self.handleError();
					
					// return the response for succeeding callbacks
					return response;
				}
			}

			callAttrs.headers = {"X-Requested-With":null};
			// form file upload still not supported with xhrPost
			if (!isAccessControlAllowOrigin || hasFiles) {
				callAttrs.handleAs = "html";
				dojo.io.iframe.send(callAttrs);
			} else {
				callAttrs.handleAs = "json";
				delete callAttrs.content["apsws.callback"];
				delete callAttrs.content["apsws.redirectHref"];
				if(!attrs.sync)
					callAttrs.sync = false;
				else
					callAttrs.sync = true;
				dojo.xhrPost(callAttrs);
			}
		}
})
