/*jslint this: true, browser: true, for: true, long: true */
/*global window console demonstrationHelper */

(function () {
    // Create a helper function to remove some boilerplate code from the example itself.
    const demo = demonstrationHelper({
        "responseElm": document.getElementById("idResponse"),
        "javaScriptElm": document.getElementById("idJavaScript"),
        "accessTokenElm": document.getElementById("idBearerToken"),
        "retrieveTokenHref": document.getElementById("idHrefRetrieveToken"),
        "tokenValidateButton": document.getElementById("idBtnValidate"),
        "accountsList": document.getElementById("idCbxAccount"),
        "footerElm": document.getElementById("idFooter")
    });
    const fictivePrice = 70;  // SIM doesn't allow calls to price endpoint for most instruments
    let lastOrderId = 0;

    /**
     * Helper function to convert the json string to an object, with error handling.
     * @return {Object} The newOrderObject from the input field - null if invalid
     */
    function getOrderObjectFromJson() {
        let newOrderObject = null;
        try {
            newOrderObject = JSON.parse(document.getElementById("idNewOrderObject").value);
        } catch (e) {
            console.error(e);
        }
        return newOrderObject;
    }

    /**
     * Modify the order object so the elements comply to the order type.
     * @return {void}
     */
    function selectOrderType() {
        const newOrderObject = getOrderObjectFromJson();
        newOrderObject.OrderType = document.getElementById("idCbxOrderType").value;
        newOrderObject.AccountKey = demo.user.accountKey;
        delete newOrderObject.OrderPrice;
        delete newOrderObject.StopLimitPrice;
        delete newOrderObject.TrailingstopDistanceToMarket;
        delete newOrderObject.TrailingStopStep;
        switch (newOrderObject.OrderType) {
        case "Limit":  // A buy order will be executed when the price falls below the provided price point; a sell order when the price increases beyond the provided price point.
            newOrderObject.OrderPrice = fictivePrice;
            document.getElementById("idNewOrderObject").value = JSON.stringify(newOrderObject, null, 4);
            break;
        case "Market":  // Order is attempted filled at best price in the market.
            document.getElementById("idNewOrderObject").value = JSON.stringify(newOrderObject, null, 4);
            break;
        case "StopIfBid":  // A buy order will be executed when the bid price increases to the provided price point; a sell order when the price falls below.
        case "StopIfOffered":  // A buy order will be executed when the ask price increases to the provided price point; a sell order when the price falls below.
        case "StopIfTraded":  // A buy order will be executed when the last price increases to the provided price point; a sell order when the price falls below.
            newOrderObject.OrderPrice = fictivePrice;
            document.getElementById("idNewOrderObject").value = JSON.stringify(newOrderObject, null, 4);
            break;
        case "StopLimit":  // A buy StopLimit order will turn in to a regular limit order once the price goes beyond the OrderPrice. The limit order will have a OrderPrice of the StopLimitPrice.
            newOrderObject.OrderPrice = fictivePrice;
            newOrderObject.StopLimitPrice = fictivePrice + 1;  // Some other fictivePrice
            document.getElementById("idNewOrderObject").value = JSON.stringify(newOrderObject, null, 4);
            break;
        case "TrailingStop":  // A trailing stop order type is used to guard a position against a potential loss, but the order price follows that of the position when the price goes up. It does so in steps, trying to keep a fixed distance to the current price.
        case "TrailingStopIfBid":
        case "TrailingStopIfOffered":
        case "TrailingStopIfTraded":
            newOrderObject.OrderPrice = fictivePrice;
            newOrderObject.TrailingstopDistanceToMarket = 1;
            newOrderObject.TrailingStopStep = 0.1;
            document.getElementById("idNewOrderObject").value = JSON.stringify(newOrderObject, null, 4);
            break;
        default:
            console.error("Unsupported order type " + newOrderObject.OrderType);
        }
    }

    /**
     * Adjust the order object in the textarea so the related properties comply with the chosen order duration.
     * @return {void}
     */
    function selectOrderDuration() {
        const newOrderObject = getOrderObjectFromJson();
        let now;
        newOrderObject.OrderDuration.DurationType = document.getElementById("idCbxOrderDuration").value;
        switch (newOrderObject.OrderDuration.DurationType) {
        case "DayOrder":
        case "GoodTillCancel":
        case "FillOrKill":
        case "ImmediateOrCancel":  // The order is working for a very short duration and when the time is up, the order is canceled. What ever fills happened in the short time, is what constitute a position. Primarily used for Fx and CFDs.
            delete newOrderObject.OrderDuration.ExpirationDateTime;
            delete newOrderObject.OrderDuration.ExpirationDateContainsTime;
            break;
        case "GoodTillDate":  // Requires an explicit date. Cancellation of the order happens at some point on that date.
            now = new Date();
            now.setDate(now.getDate() + 3);  // Add 3x24 hours to now
            now.setSeconds(0, 0);
            newOrderObject.OrderDuration.ExpirationDateTime = now.getFullYear() + "-" + (now.getMonth() + 1) + "-" + now.getDate() + "T" + now.getHours() + ":" + now.getMinutes() + ":00";  // Example: 2020-03-20T14:00:00
            newOrderObject.OrderDuration.ExpirationDateContainsTime = true;
            break;
        default:
            console.error("Unsupported order duration " + newOrderObject.OrderDuration.DurationType);
        }
        document.getElementById("idNewOrderObject").value = JSON.stringify(newOrderObject, null, 4);
    }

    function populateOrderTypes(orderTypes) {
        const cbxOrderType = document.getElementById("idCbxOrderType");
        let option;
        let i;
        for (i = cbxOrderType.options.length - 1; i >= 0; i -= 1) {
            cbxOrderType.remove(i);
        }
        for (i = 0; i < orderTypes.length; i += 1) {
            option = document.createElement("option");
            option.text = orderTypes[i];
            option.value = orderTypes[i];
            cbxOrderType.add(option);
        }
    }

    /**
     * This is an example of getting a pre-filled strategy for an option root.
     * @return {void}
     */
    function getStrategy() {
        const optionRootId = document.getElementById("idInstrumentId").value;
        const optionStrategyType = document.getElementById("idCbxOptionStrategy").value;
        fetch(
            demo.apiUrl + "/trade/v2/orders/multileg/defaults?AccountKey=" + encodeURIComponent(demo.user.accountKey) + "&OptionRootId=" + optionRootId + "&OptionsStrategyType=" + optionStrategyType,
            {
                "method": "GET",
                "headers": {
                    "Authorization": "Bearer " + document.getElementById("idBearerToken").value
                }
            }
        ).then(function (response) {
            if (response.ok) {
                response.json().then(function (responseJson) {
                    const newOrderObject = getOrderObjectFromJson();
                    let i;
                    newOrderObject.AccountKey = demo.user.accountKey;
                    newOrderObject.OrderDuration = {
                        "DurationType": document.getElementById("idCbxOrderDuration").value
                    };
                    newOrderObject.OrderType = document.getElementById("idCbxOrderType").value;
                    newOrderObject.Legs = responseJson.Legs;
                    for (i = 0; i < newOrderObject.Legs.length; i += 1) {
                        newOrderObject.Legs[i].ToOpenClose = "ToOpen";
                    }
                    document.getElementById("idNewOrderObject").value = JSON.stringify(newOrderObject, null, 4);
                    selectOrderType();
                    selectOrderDuration();
                    selectOrderType();
                    console.log("The strategy has been updated to " + optionStrategyType + ".");
                });
            } else {
                demo.processError(response);
            }
        }).catch(function (error) {
            console.error(error);
        });
    }

    /**
     * This is an example of getting the series (option sheet) of an option root.
     * @return {void}
     */
    function getSeries() {
        const optionRootId = document.getElementById("idInstrumentId").value;
        const newOrderObject = getOrderObjectFromJson();
        newOrderObject.AccountKey = demo.user.accountKey;
        document.getElementById("idNewOrderObject").value = JSON.stringify(newOrderObject, null, 4);
        fetch(
            demo.apiUrl + "/ref/v1/instruments/contractoptionspaces/" + optionRootId + "?OptionSpaceSegment=AllDates&TradingStatus=Tradable",
            {
                "method": "GET",
                "headers": {
                    "Authorization": "Bearer " + document.getElementById("idBearerToken").value
                }
            }
        ).then(function (response) {
            if (response.ok) {
                response.json().then(function (responseJson) {
                    // Test for SupportedOrderTypes, ContractSize, Decimals and TickSizeScheme
                    populateOrderTypes(responseJson.SupportedOrderTypes);
                    selectOrderType();
                    console.log(JSON.stringify(responseJson, null, 4));
                });
            } else {
                demo.processError(response);
            }
        }).catch(function (error) {
            console.error(error);
        });
    }

    /**
     * This is an example of an order validation.
     * @return {void}
     */
    function preCheckNewOrder() {
        // Bug: Preview doesn't check for limit outside market hours
        // Bug: Sometimes the response is CouldNotCompleteRequest - meaning you need to do the request again
        const newOrderObject = getOrderObjectFromJson();
        newOrderObject.AccountKey = demo.user.accountKey;
        newOrderObject.FieldGroups = ["Costs", "MarginImpactBuySell"];
        fetch(
            demo.apiUrl + "/trade/v2/orders/multileg/precheck",
            {
                "method": "POST",
                "headers": {
                    "Authorization": "Bearer " + document.getElementById("idBearerToken").value,
                    "Content-Type": "application/json; charset=utf-8",
                    // https://www.developer.saxo/openapi/learn/rate-limiting
                    "X-Request-ID": Math.random()  // This prevents error 409 (Conflict) from identical previews within 15 seconds
                },
                "body": JSON.stringify(newOrderObject)
            }
        ).then(function (response) {
            if (response.ok) {
                response.json().then(function (responseJson) {
                    // Response must have PreCheckResult property being "Ok"
                    if (responseJson.PreCheckResult === "Ok") {
                        // Secondly, you can have a PreCheckResult of "Ok", but still a (functional) error
                        // Order could be placed if the account had sufficient margin and funding.
                        // In this case all calculated cost and margin values are in the response, together with an ErrorInfo object:
                        if (responseJson.hasOwnProperty("ErrorInfo")) {
                            console.error(response.ErrorInfo.Message + "\n\n" + JSON.stringify(responseJson, null, 4));
                        } else {
                            // The order can be placed
                            console.log(JSON.stringify(responseJson, null, 4));
                        }
                    } else {
                        // Order request is syntactically correct, but the order cannot be placed, as it would violate semantic rules
                        console.error(JSON.stringify(responseJson, null, 4));
                    }
                });
            } else {
                demo.processError(response);
            }
        }).catch(function (error) {
            console.error(error);
        });
    }

    /**
     * This is an example of placing a single leg order.
     * @return {void}
     */
    function placeNewOrder() {
        const newOrderObject = getOrderObjectFromJson();
        const headersObject = {
            "Authorization": "Bearer " + document.getElementById("idBearerToken").value,
            "Content-Type": "application/json; charset=utf-8"
        };
        newOrderObject.AccountKey = demo.user.accountKey;
        if (document.getElementById("idChkRequestIdHeader").checked) {
            headersObject["X-Request-ID"] = newOrderObject.ExternalReference;  // Warning! Prevent error 409 (Conflict) from identical orders within 15 seconds
        }
        fetch(
            demo.apiUrl + "/trade/v2/orders/multileg",
            {
                "method": "POST",
                "headers": headersObject,
                "body": JSON.stringify(newOrderObject)
            }
        ).then(function (response) {
            if (response.ok) {
                response.json().then(function (responseJson) {
                    const xRequestId = response.headers.get("X-Request-ID");
                    console.log("Successful request:\n" + JSON.stringify(responseJson, null, 4) + (
                        xRequestId === null
                        ? ""
                        : "\nX-Request-ID response header: " + xRequestId
                    ));
                    lastOrderId = responseJson.MultiLegOrderId;
                });
            } else {
                demo.processError(response);
            }
        }).catch(function (error) {
            console.error(error);
        });
    }

    /**
     * This is an example of updating a single leg order.
     * @return {void}
     */
    function modifyLastOrder() {
        const newOrderObject = getOrderObjectFromJson();
        const headersObject = {
            "Authorization": "Bearer " + document.getElementById("idBearerToken").value,
            "Content-Type": "application/json; charset=utf-8"
        };
        newOrderObject.AccountKey = demo.user.accountKey;
        newOrderObject.MultiLegOrderId = lastOrderId;
        if (document.getElementById("idChkRequestIdHeader").checked) {
            headersObject["X-Request-ID"] = newOrderObject.ExternalReference;  // Warning! Prevent error 409 (Conflict) from identical orders within 15 seconds
        }
        fetch(
            demo.apiUrl + "/trade/v2/orders/multileg",
            {
                "method": "PATCH",
                "headers": headersObject,
                "body": JSON.stringify(newOrderObject)
            }
        ).then(function (response) {
            if (response.ok) {
                response.json().then(function (responseJson) {
                    const xRequestId = response.headers.get("X-Request-ID");
                    console.log("Successful request:\n" + JSON.stringify(responseJson, null, 4) + (
                        xRequestId === null
                        ? ""
                        : "\nX-Request-ID response header: " + xRequestId
                    ));
                });
            } else {
                demo.processError(response);
            }
        }).catch(function (error) {
            console.error(error);
        });
    }

    /**
     * This is an example of removing an order from the book.
     * @return {void}
     */
    function cancelLastOrder() {
        fetch(
            demo.apiUrl + "/trade/v2/orders/multileg/" + lastOrderId + "?AccountKey=" + encodeURIComponent(demo.user.accountKey),
            {
                "method": "DELETE",
                "headers": {
                    "Authorization": "Bearer " + document.getElementById("idBearerToken").value
                }
            }
        ).then(function (response) {
            if (response.ok) {
                response.json().then(function (responseJson) {
                    // Response must have an OrderId
                    console.log(JSON.stringify(responseJson, null, 4));
                });
            } else {
                demo.processError(response);
            }
        }).catch(function (error) {
            console.error(error);
        });
    }

    document.getElementById("idCbxOptionStrategy").addEventListener("change", function () {
        demo.run(getStrategy);
    });
    document.getElementById("idCbxOrderType").addEventListener("change", function () {
        demo.run(selectOrderType);
    });
    document.getElementById("idCbxOrderDuration").addEventListener("change", function () {
        demo.run(selectOrderDuration);
    });
    document.getElementById("idBtnGetStrategy").addEventListener("click", function () {
        demo.run(getStrategy);
    });
    document.getElementById("idBtnGetSeries").addEventListener("click", function () {
        demo.run(getSeries);
    });
    document.getElementById("idBtnPreCheckOrder").addEventListener("click", function () {
        demo.run(preCheckNewOrder);
    });
    document.getElementById("idBtnPlaceNewOrder").addEventListener("click", function () {
        demo.run(placeNewOrder);
    });
    document.getElementById("idBtnModifyLastOrder").addEventListener("click", function () {
        demo.run(modifyLastOrder);
    });
    document.getElementById("idBtnCancelLastOrder").addEventListener("click", function () {
        demo.run(cancelLastOrder);
    });
    demo.displayVersion("trade");
}());
