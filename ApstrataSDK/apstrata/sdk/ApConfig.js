
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

dojo.provide('apstrata.sdk.ApConfig');

dojo.setObject("apstrata.apConfig", {
    // apstrata.ui related
    "apstrata.ui": {
        "widgets.Login" : {
            autoLogin: false
        }
    },
 
    // apstrata.sdk related
    "apstrata.sdk": {
        "Connection" : {
            credentials: {
                key: "",
                secret: "",
                username: "",
                password: ""
            },
            serviceURL: 'http://sandbox.apstrata.com/apsdb/rest',
            defaultStore: '',
            timeout: 10000
        }
    }
});

//This parameter specifies if signature legacy mode is on or off. By default, it is on, so that the SDK remains backward compatible
apstrata.apConfig["signatureLegacyMode"] = "on";
