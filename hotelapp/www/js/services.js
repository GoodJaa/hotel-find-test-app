angular.module('starter.services', [])

    .factory('httpService', function ($http, $q, $timeout) {
        function sendRequest(url) {
            let deffered = $q.defer()
            $timeout(
                function () {
                    $http
                        .get(url).then(function (data) {
                            deffered.resolve(data.data);
                        }, function (error) {
                            let errorText = 'Ошибка при отправке запроса';
                            switch (error.status) {
                                case 404:
                                    errorText = "Информация об отелях не найдена"
                                    break;
                                case 401:
                                    errorText = "Не пройдена авторизация"
                                    break;
                                case 500:
                                    errorText = "Ошибка сервера"
                                    break;
                            }
                            deffered.reject(errorText)
                        })
                }, 2000
            )
            return deffered.promise
        }
        function getHotels() {
            return sendRequest('../stub/hotels.json')
        }
        return {
            getHotels: getHotels,
        }
    })

    .factory('bookingService', function ($window, $timeout, $q, httpService) {
        const prefs = $window.plugins && $window.plugins.appPreferences;
        function sendRequestToGet() {
            let deferred = $q.defer();

            $timeout(
                function () {
                    if (prefs) {
                        prefs.fetch('reservationHotels')
                            .then(data => deferred.resolve(data))
                            .catch(error => deferred.reject(error))
                    } else {
                        if ($window.localStorage) {
                            let reservationsInStorage = JSON.parse($window.localStorage.getItem('reservationHotels'));
                            deferred.resolve(reservationsInStorage)
                        } else {
                            deferred.reject('Ошибка запроса')
                        }
                    }
                }, 0
            )
            return deferred.promise
        }

        function sendRequestToSave(persistentObj) {
            let deferred = $q.defer();

            $timeout(
                function () {
                    if (prefs) {
                        prefs.store('reservationHotels', persistentObj)
                            .then(() => deferred.resolve())
                            .catch(error => deferred.reject(error))
                    } else {
                        if (persistentObj) {
                            $window.localStorage.setItem('reservationHotels', JSON.stringify(persistentObj));
                            deferred.resolve();
                        } else {
                            deferred.reject(
                                'Ошибка сохранения'
                            )
                        }
                    }
                }, 0
            )
            return deferred.promise
        }

        function saveReservations(id, dates, rewriting) {
            let deferred = $q.defer();

            $timeout(
                function () {
                    let datesException;
                    let indexOfMatchingEntry;
                    sendRequestToGet()
                        .then(function (response) {
                            if (response) {
                                let hotelsObj = response;
                                let currentObjHotel = hotelsObj[id];

                                if (currentObjHotel) {
                                    if (rewriting) {
                                        indexOfMatchingEntry = currentObjHotel.findIndex(function (item) {
                                            return (dates.arrivalDate >= item.arrivalDate && dates.exitDate <= item.exitDate) || (dates.arrivalDate < item.arrivalDate && dates.exitDate > item.exitDate)
                                        })
                                        currentObjHotel[indexOfMatchingEntry] = dates;
                                        datesException = false;
                                        sendRequestToSave(hotelsObj)
                                            .then(function () {
                                                deferred.resolve();
                                            })
                                            .catch(function (error) {
                                                deferred.reject(error);
                                            })
                                        return;
                                    }

                                    let alreadyBooked = currentObjHotel.some(function (item) {
                                        return ((dates.arrivalDate >= item.arrivalDate && dates.exitDate <= item.exitDate) ||
                                            (dates.arrivalDate < item.arrivalDate && dates.exitDate > item.exitDate) ||
                                            (dates.arrivalDate == item.arrivalDate && dates.exitDate > item.exitDate) ||
                                            (dates.arrivalDate < item.arrivalDate && dates.exitDate == item.exitDate))
                                    })
                                    if (alreadyBooked) {
                                        datesException = true;
                                        deferred.resolve(datesException);
                                        return;
                                    }
                                    currentObjHotel.push(dates);
                                } else {
                                    hotelsObj[id] = [dates]
                                }

                                datesException = false;
                                sendRequestToSave(hotelsObj)
                                    .then(function () {
                                        deferred.resolve()
                                    })
                                    .catch(function (error) {
                                        deferred.reject(error);
                                    })
                                return;
                            } else {
                                sendRequestToSave({
                                    [id]: [dates]
                                })
                                    .then(function () {
                                        deferred.resolve()
                                    })
                                    .catch(function (error) {
                                        deferred.reject(error);
                                    })
                            }
                        })
                        .catch(function (error) {
                            deferred.reject(error)
                        })
                }
            )
            return deferred.promise;
        }

        function removeReservations(id, i) {
            let deferred = $q.defer();

            $timeout(
                function () {
                    sendRequestToGet()
                        .then(function (response) {
                            let reservations = response;
                            if (reservations[id]) {
                                if (reservations[id].length > 1) {
                                    reservations[id].splice(i, 1)
                                } else {
                                    delete reservations[id];
                                }
                                sendRequestToSave(reservations)
                                    .then(function () {
                                        deferred.resolve()
                                    })
                                    .catch(function (error) {
                                        deferred.reject(error)
                                    })
                            } else {
                                deferred.reject('Ошибка чтения записи')
                            }
                        })
                        .catch(function (error) {
                            deferred.reject(error)
                        })
                }, 0
            )

            return deferred.promise;
        }

        return {
            sendRequestToGet,
            saveReservations,
            removeReservations
        }
    })