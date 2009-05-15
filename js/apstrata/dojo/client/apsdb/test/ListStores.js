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

dojo.provide("apstrata.dojo.client.apsdb.test.ListStores");

dojo.require("apstrata.dojo.client.apsdb.ListStores");

dojo.declare("apstrata.dojo.client.apsdb.test.ListStores",
[],
{
    execute: function() {
        // Load credentials from auth.json
        dojo.xhrGet( {
            url: "auth.json",
            handleAs: "json",

            load: function(auth, ioArgs) {
                console.debug("using credentials loaded from auth.json:"); 
                console.dir(auth);

                // Execute apsdb operation
                var ls = new apstrata.dojo.client.apsdb.ListStores(auth);
                dojo.connect(ls, "handleResult", function(){
                    console.dir(ls.stores);
                })
                ls.execute();
                //ls.abort();
            }
        });        
    }
})