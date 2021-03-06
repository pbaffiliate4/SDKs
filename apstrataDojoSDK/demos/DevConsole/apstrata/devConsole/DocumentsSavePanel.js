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

dojo.provide("apstrata.devConsole.DocumentsSavePanel");
dojo.provide("apstrata.devConsole.DocumentsSaveField");
dojo.provide("apstrata.devConsole.DocumentsSaveFieldValue");

dojo.require("dijit.layout.LayoutContainer");
dojo.require("dijit.form.ToggleButton");
dojo.require("dojo.data.ItemFileReadStore");
dojo.require("dijit.form.FilteringSelect");
dojo.require("dojo.date.locale");
dojo.require("dojox.form.FileInput");

dojo.declare("apstrata.devConsole.DocumentsSavePanel", 
[dijit._Widget, dojox.dtl._Templated, apstrata.horizon._HStackableMixin], 
{
	widgetsInTemplate: true,
	fieldSerialNumber: 0,
	templatePath: dojo.moduleUrl("apstrata.devConsole", "templates/DocumentsSavePanel.html"),
	listSchemas: [],
	storeName: null,
	
	constructor: function(attrs) {
		var self = this;
		self.storeName = attrs.target;
		self.docKey = attrs.docKey;
		
    // remove apsdb_user from the schemas list
		var max = attrs.listSchemas.length;
		for (var i = 0; i < max; i++){
		  if (attrs.listSchemas[i].name == "apsdb_user")
		  {
		    attrs.listSchemas.splice(i,1);
		    break;
		  }
		};
		
		self.listSchemas = attrs.listSchemas;
		self.update = (attrs.docKey && attrs.docKey!='') ? true : false;
		self.currentPage = attrs.currentPage;
		self.ftsFields = '';
	},
	
	postCreate: function() {
		var self = this;	
		this.userListFetched = false
		
		// populating the users list upon opening of the drop down
		dojo.connect(self.runAs, 'onClick', function () {
			if (self.userListFetched) return
			self.container.client.call({
				action: "ListUsers",
				request: {
					apsdb: {
						query: ""
					}
				},			
				load: function(operation) {
					self.data = []
					self.userListFetched = true
					dojo.forEach(operation.response.result.users, function(user) {
						self.data.push({name: user['login'], label: user['login'], abbreviation: user['login']})
					})
					
					self.userList = {identifier:'abbreviation',label: 'name',items: self.data}
		        	self.runAs.store = new dojo.data.ItemFileReadStore({ data: self.userList });
				},
				error: function(operation) {
				}
			})
	    });		
		
		//if document key exists, gets the document information to be edited
		if (this.docKey) {
			var apsdb = {
				store: self.storeName,
				query: 'apsdb.documentKey="' + self.docKey + '"',
				includeFieldType: true,
				queryFields: '*'
			}
			
			var attrs = {
				action: "Query",
				request: {
					apsdb: apsdb
				},
				load: function(operation) {
					// operation.response.result
					var q = operation.response
					if (q.result.documents[0]) {
						self.schemaName.attr("readOnly",true);  // Disable the schema drop down
						for(var fieldName in q.result.documents[0]) {
							fieldValue = q.result.documents[0][fieldName];
							if(fieldName=='key') {
								self.documentKey.attr("value",fieldValue);
							}
							
							if(fieldName=='versionNumber') {
								self.versionNumber.attr("value",fieldValue);
							}			
														
							// Considering schema for future changes
							if(fieldName=='apsdb.objectName' || fieldName=='apsdb.schema') {
								if(fieldValue != '' && fieldValue != 'templateForm') {
									self.schemaName.attr("value",fieldValue);
								}
							}
							
							// Add a populated field widget
							if ((fieldName.indexOf('apsdb.') == -1) && (fieldName != '_type') && (fieldName != 'key') && (fieldName != 'versionNumber')) {
								//when having one single value for the field
								if(typeof fieldValue == "string") {
									fieldValue = [fieldValue];
								}
								
								var field = new apstrata.devConsole.DocumentsSaveField({fieldName:fieldName, fieldValues: fieldValue, fieldType: q.result.documents[0]['_type'][fieldName], update: true, documentForm: self});
								self.fieldsList.addChild(field);
							}
						}						
					}
				},
				error: function(operation) {
					if (keywordArgs.onError) keywordArgs.onError({errorCode: operation.response.metadata.errorCode, errorMessage: operation.response.metadata.errorMessage}, request)
				}
			}
			
			this.container.client.call(attrs);
		} else {
			this.versionNumberDiv.style.display = 'none'; // Hide the versionNumber field
			//adding one single field by default
			this._addFieldLine();
		}
		
		this.inherited(arguments);
	},

	_save: function() {
		var docSavePanel = this;
		if (this.saveDocumentForm.validate()) {
			
			var attrs
			var apsdb = {
				store: docSavePanel.target			
			}
			
			if(docSavePanel.schemaName.attr("value")!='') {
				apsdb.schema = docSavePanel.schemaName.attr("value");								
			}
	
			if(docSavePanel.documentKey.attr("value")!='') {
				apsdb.documentKey = docSavePanel.documentKey.attr("value");								
			}
			
			if(docSavePanel.runAs.attr("value")!='') {
				apsdb.runAs = docSavePanel.runAs.attr("value");								
			}	
			
			apsdb.update = docSavePanel.update;
			
			attrs = {
				action: "SaveDocument",
				request: {
					apsdb: apsdb
				},

				load: function(operation){
					if(docSavePanel.update == true) {
						docSavePanel.getParent()._query(null, docSavePanel.currentPage);
					}
				},
				error: function(operation){
				}
			}
			
			var fields = docSavePanel.fieldsList.getChildren();
			for(var fieldsIndex=0; fieldsIndex < fields.length; fieldsIndex++) {
				var field = fields[fieldsIndex];
				
				if (field.fieldValuesList.hasChildren() && field.fieldType.value != 'file') {
					var fieldValues = field.fieldValuesList.getChildren();
					attrs.request[field.fieldName.value] = new Array();
					for(var i=0; i<fieldValues.length; i++) {
						sentVal = fieldValues[i].fieldValue.value;
						if (field.fieldType.value=='date') {
							sentVal = (fieldValues[i].fieldDateValue.value != null && fieldValues[i].fieldDateValue.value != '') ? (dojo.date.locale.format(fieldValues[i].fieldDateValue.value, {datePattern:"yyyy-MM-dd", timePattern: "'T'HH:mm:ssZ"})) : '';
							sentVal = sentVal.replace(' ','');
						}

						attrs.request[field.fieldName.value].push(sentVal);
					}
				} else if (field.fieldType.value == 'file') {
					if (this.update) {
						apsdb['multivalueAppend'] = field.fieldName.value;
					}
					attrs['formNode'] = this.saveDocumentForm.domNode;
					attrs['useHttpMethod'] = "POST";
				}
				
				if (field.ftsFields.attr("checked")) {
					apsdb.ftsFields = (apsdb.ftsFields) ? field.fieldName.value + "," + apsdb.ftsFields : field.fieldName.value;
				}
				
				attrs.request[field.fieldName.value+".apsdb.fieldType"] = (field.fieldType.value!='') ? field.fieldType.value : '';
			}
			this.container.client.call(attrs);
		}
	},	
	
	_addFieldLine: function() {
		// Adds the newField node to the document
		var newField = new apstrata.devConsole.DocumentsSaveField({fieldName:null, fieldValues:null, fieldType:null, documentForm: this});
		this.fieldsList.addChild(newField);
	},
	
	_schemaChanged: function() {
		for (var i=0; i<this.fieldsList.getChildren().length; i++) {
			if (this.fieldsList.getChildren()[i].fieldType.attr("value") == "file") {
				if (this.schemaName.attr("value") == "") {
					this.fieldsList.getChildren()[i].fieldName.attr("readOnly", true);
					this.fieldsList.getChildren()[i].fieldName.attr("value", "apsdb_attachments");
				} else {
					this.fieldsList.getChildren()[i].fieldName.attr("readOnly", false);
				}
			}
		}
	},
	
	_cancel: function() {
		this.panel.destroy();
	}
})


dojo.declare("apstrata.devConsole.DocumentsSaveField", [dijit._Widget, dijit._Templated], 
{
	widgetsInTemplate: true,
	templateString: null,
	templatePath: dojo.moduleUrl("apstrata.devConsole", "templates/DocumentsSaveField.html"),
	
	/**
	 * Constructor of the Document Fields widget.
	 */
	constructor: function(attrs) {
		this.fldName = attrs.fieldName;
		this.fldValues = attrs.fieldValues;	
		this.fldType = attrs.fieldType;
		this.update = attrs.update;
		this.documentForm = attrs.documentForm
	},
	
	postCreate: function() {
		this.fieldName.attr("value", this.fldName);
		this.fieldType.attr("value", this.fldType);
		if (this.update) {
			this.fieldType.attr("readOnly",true);
		}
		if(this.fldValues) {
			for(var i=0; i<this.fldValues.length; i++) {
				this.fieldValuesList.addChild(new apstrata.devConsole.DocumentsSaveFieldValue({fieldValue: this.fldValues[i], referencedField: this}));
			}	
		} else {
			this._addFieldValue();
		}
	},
	
	_typeChanged: function() {
		var selectedType = this.fieldType.attr("value");
		if (selectedType == 'file' && this.documentForm.schemaName == '') {
			this.fieldName.attr("value", "apsdb_attachments");
			this.fieldName.attr("readOnly",true);
		} else {
			this.fieldName.attr("readOnly",false);
		}
		
		if (this.fieldValuesList.hasChildren()) {
			for(var i=0; i<this.fieldValuesList.getChildren().length; i++) {
				this.fieldValuesList.getChildren()[i]._typeChanged();
			}
		}
	},
	
	
	_fieldNameChanged: function() {
		var selectedType = this.fieldType.attr("value");
		if (selectedType == 'file' && this.fieldName.attr("value") != this.fldName) {
			for(var i=0; i<this.fieldValuesList.getChildren().length; i++) {
				this.fieldValuesList.getChildren()[i].apsdb_attachments.domNode.getElementsByTagName("input")[0].setAttribute("name", this.fieldName.attr("value"));
			}			
		}
	},	
	
	_addFieldValue: function() {
		// Adds the newField node to the document
		var newFieldValue = new apstrata.devConsole.DocumentsSaveFieldValue({fieldValue:null, referencedField: this});
		this.fieldValuesList.addChild(newFieldValue);		
	},	
	
	_removeFieldLine: function() {
		// Remove the field container.
		this.destroy();
		return;	
	}	
})

dojo.declare("apstrata.devConsole.DocumentsSaveFieldValue", [dijit._Widget, dijit._Templated], 
{
	widgetsInTemplate: true,
	templateString: "<div dojoAttachPoint=\"valuesDiv\">"+
					"<button dojoAttachEvent='onClick: _removeFieldValue' dojoType='dijit.form.Button'>-</button>"+
	                "<div dojoAttachPoint=\"fileTypeInput\" style=\"display:none;\"><input dojoAttachEvent='onClick: _fileChanged' dojoAttachPoint=\"apsdb_attachments\" style=\"width:144px\" dojoType=\"dojox.form.FileInput\" class=\"rounded-xsml dijitInlineTable\" /></div>"+
	                "<div dojoAttachPoint=\"otherTypeInput\" style=\"display:none;\"><input dojoAttachPoint=\"fieldValue\" type=\"text\" dojoType=\"dijit.form.ValidationTextBox\" required=\"false\" class=\"rounded-xsml\"/></div>"+
		            "<div dojoAttachPoint=\"dateTypeInput\" style=\"display:none;\"><input dojoAttachPoint=\"fieldDateValue\" constraints=\"{datePattern:'dd/MM/yyyy HH:mm:ss'}\" type=\"text\" dojoType=\"dijit.form.DateTextBox\" required=\"false\" class=\"rounded-xsml\"/></div>"+
		            "</div>",
	
	/**
	 * Constructor of the Document Field value widget.
	 */
	constructor: function(attrs) {
		this.referencedField = attrs.referencedField;
		this.fldValue = attrs.fieldValue;
	},
	
	_fileChanged: function() {
			this.apsdb_attachments.domNode.getElementsByTagName("input")[0].setAttribute("name", this.referencedField.fieldName.attr("value"));
	},
	
	postCreate: function() {
		var self = this;
		this.apsdb_attachments.domNode.getElementsByTagName("input")[0].setAttribute("name", "");
		
		if (this.fldValue!=null && this.fldValue!='') {
			if (this.referencedField.fieldType.attr("value")=='date') {
				this.fieldDateValue.attr("value", this._parseDate(this.fldValue));
			} else if (this.referencedField.fieldType.attr("value")=='file') {
				this.apsdb_attachments.attr("value", this.fldValue);
			} else {
				this.fieldValue.attr("value", this.fldValue);
			}
		}
		
		this._typeChanged();
	},	
	
	_typeChanged: function() {
		dojo.style(this.dateTypeInput, "display", "none");
		dojo.style(this.fileTypeInput, "display", "none");
		dojo.style(this.otherTypeInput, "display", "none");
		if (this.referencedField.fieldType.attr("value") == "file") {
			dojo.style(this.fileTypeInput, "display", "inline");
		} else if (this.referencedField.fieldType.attr("value") == "date") {
			dojo.style(this.dateTypeInput, "display", "inline");
			if(this.fieldDateValue.attr("value")==null) {
				this.fieldDateValue.attr("value", new Date());
			}
		} else {
			dojo.style(this.otherTypeInput, "display", "inline");
		}
	},
	
	_removeFieldValue: function() {
		// Remove the field value container.
		this.destroy();
		return;			
	},
	
	_parseDate: function(value) {
		var dateVal = dojo.date.locale.parse(value.split('T')[0], {datePattern:'yyyy-MM-dd', selector: 'date'});
		var timeVal = dojo.date.locale.parse(value.substring(value.indexOf('T')), {timePattern: "'T'HH:mm:ssZ", selector: 'time'});
//		dateVal.setUTCHours(timeVal.getUTCHours());
//		dateVal.setUTCMinutes(timeVal.getUTCMinutes());
//		dateVal.setUTCSeconds(timeVal.getUTCSeconds());
		dateVal.setHours(timeVal.getHours());
		dateVal.setMinutes(timeVal.getMinutes());
		dateVal.setSeconds(timeVal.getSeconds());
	    return dateVal;
	}
})