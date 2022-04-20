angular.module('starter.controllers', [])

  .controller('AppCtrl', function ($scope, $timeout) {

  })

  .controller('HotelsCtrl', function ($scope, $state, httpService) {
    $scope.isLoaded = false;

    $scope.showHotel = function (hotel) {
      $state.go('hotel', {hotel: hotel})
    }

    $scope.doRefresh = function () {
      httpService.getHotels()
        .then(function (data) {
          $scope.hotels = data;
          if (data.length) {
            $scope.errorMessage = undefined;
          } else {
            $scope.errorMessage = 'Отели не найдены'
          }
        })
        .catch(function (error) {
          $scope.errorMessage = error;
        })
        .finally(function () {
          $scope.isLoaded = true;
          $scope.$broadcast('scroll.refreshComplete');
        })
    }

    $scope.doRefresh();
  })

  .controller('HotelCtrl', function ($scope, $state, $ionicModal, $ionicPopup, bookingService) {
    $scope.hotel = {};
    console.log(1)
    $scope.$on('$ionicView.beforeEnter', function () {
      console.log(2)
      $scope.hotel = $state.params.hotel;
      $scope.hasParking = $scope.hotel.hasParking ? 'Есть' : 'Нет';
      $scope.bathroom = $scope.hotel.bathroom ? 'В номере' : 'Общий на этаже';
      $scope.smoking = $scope.hotel.smoking ? 'Разрешено' : 'Запрещено';
    })

    $scope.getTitle = function() {
      return $scope.hotel.title;
    }

    function formatDate(date) {
      let today = date ? new Date(date) : new Date();
      let dd = String(today.getDate()).padStart(2, '0');
      let mm = String(today.getMonth() + 1).padStart(2, '0');
      let yyyy = today.getFullYear();

      today = yyyy + '-' + mm + '-' + dd;
      if (date) {
        return today
      }
      $scope.reservationData.currentDate = today;
    }

    $scope.validationExitDate = function () {
      if ($scope.reservationData.arrivalDate) {
        return formatDate($scope.reservationData.arrivalDate.setHours(0, 0, 0, 0))
      }
      return $scope.reservationData.currentDate
    }

    $scope.validationArrivalDate = function () {
      if ($scope.reservationData.exitDate) {
        return formatDate($scope.reservationData.exitDate.setHours(0, 0, 0, 0))
      }
      return
    }

    $scope.saveReservation = function (rewriting) {
      let id = $scope.hotel.id;
      let dates = {
        arrivalDate: $scope.reservationData.arrivalDate.setHours(0, 0, 0, 0),
        exitDate: $scope.reservationData.exitDate.setHours(0, 0, 0, 0)
      };

      bookingService.saveReservations(id, dates, rewriting)
        .then(function (response) {
          if (response) {
            $scope.datesException = response;
            return
          }
          $scope.closeReservationModal();
        })
        .catch(function (error) {
          showErrorPopup(error)
        })
    }

    function showErrorPopup(error) {
      let showErrorPopup = $ionicPopup.show({
        title: error,
        scope: $scope,
        buttons: [
          {
            text: 'Ок',
            type: 'button-assertive',
            onTap: function () {
              showErrorPopup.close()
            }
          }
        ]
      })
    }

    $scope.rewritingReservation = function () {
      $scope.saveReservation(true);
    }

    $scope.cancelRewriting = function () {
      $scope.datesException = false;
    }

    $scope.openReservationModal = function () {
      $scope.datesException = false;
      $scope.reservationData = {
        arrivalDate: '',
        exitDate: '',
        currentDate: ''
      };
      $ionicModal.fromTemplateUrl('/templates/reservation.modal.html', {
        scope: $scope,
        animation: 'slide-in-up',
      }).then(function (modal) {
        $scope.modal = modal;
        $scope.modal.show();
      });
      formatDate();
    };

    $scope.closeReservationModal = function () {
      $scope.modal.hide();
    };
  })

  .controller('SearchCtrl', function ($scope, $state, httpService) {
    $scope.isLoaded = false;
    $scope.hotels = [];

    $scope.doRefresh = function () {
      httpService.getHotels()
        .then(function (data) {
          $scope.hotels = data;
          $scope.resetFilters();
          if (data.length) {
            $scope.errorMessage = undefined;
          } else {
            $scope.errorMessage = 'Отели не найдены'
          }
        })
        .catch(function (error) {
          $scope.errorMessage = error;
        })
        .finally(function () {
          $scope.isLoaded = true;
          $scope.$broadcast('scroll.refreshComplete');
        })
    }

    $scope.hotelsSearch = function () {
      if ($scope.hotels.length) {
        $scope.filteredHotels = $scope.hotels.filter(hotel => {
          if (($scope.filters.costFrom !== null && $scope.filters.costFrom > hotel.roomCost) || ($scope.filters.costTo !== null && $scope.filters.costTo < hotel.roomCost)) {
            return false
          }
          if (($scope.filters.hasParking && !hotel.hasParking) || ($scope.filters.bathroom && !hotel.bathroom)) {
            return false
          }
          return !($scope.filters.smoking && !hotel.smoking)
        })
      }
      return
    }

    $scope.showHotel = function (hotel) {
      $state.go('hotel', { hotel: hotel })
    }

    $scope.resetFilters = function () {
      $scope.filters = {
        costFrom: null,
        costTo: null,
        hasParking: false,
        bathroom: false,
        smoking: false,
      }
      $scope.filteredHotels = $scope.hotels;
    }

    $scope.doRefresh();
  })

  .controller('ReservationsCtrl', function ($scope, $ionicPopup, $state, $interval, httpService, bookingService) {

    $scope.getCost = function (arrival, exit, pricePerDay) {
      const msToDays = 86400000;
      let days = (exit - arrival) / msToDays;
      let cost = days * pricePerDay;
      return cost;
    }

    $scope.formatDate = function (ms) {
      let date = new Date(ms);
      let [y, m, d] = [date.getFullYear(), String(date.getMonth()).padStart(2, '0'), String(date.getDate()).padStart(2, '0')];
      return `${d}.${m}.${y}`;
    }

    function findReservedHotels() {
      $scope.reservedHotels = [];
      bookingService.sendRequestToGet()
        .then(function (response) {
          if (response && Object.keys(response).length) {
            let reservations = response;
            for (let reserv in reservations) {
              let hotel = $scope.hotels.find((item) => {
                return item.id == reserv
              })
              if (!hotel) {
                continue
              }
              let dates = reservations[reserv].map(item => {
                return {
                  arrivalDate: item.arrivalDate,
                  exitDate: item.exitDate,
                }
              })
              $scope.reservedHotels.push(Object.assign({}, hotel, { dates }))
            }
          } else {
            showNotFoundPopup()
          }
        })
        .catch(function (error) {
          showErrorPopup(error)
        })
    };

    function removeReserv(id, i) {
      bookingService.removeReservations(id, i)
        .then(findReservedHotels)
        .catch(function (error) {
          showErrorPopup(error)
        })
    }

    function showErrorPopup(error) {
      let showErrorPopup = $ionicPopup.show({
        title: error,
        scope: $scope,
        buttons: [
          {
            text: 'Ок',
            type: 'button-assertive',
            onTap: function () {
              showErrorPopup.close()
            }
          }
        ]
      })
    }

    $scope.showRemoveReservationPopup = function (id, i) {
      let showRemovePopup = $ionicPopup.show({
        title: 'Вы уверены, что хотите отменить бронирование?',
        scope: $scope,
        cssClass: 'remove-popup',
        buttons: [
          {
            text: 'Нет',
            type: 'button-assertive',
            onTap: function () {
              showRemovePopup.close()
            }
          },
          {
            text: 'Да',
            type: 'button-balanced',
            onTap: function () {
              removeReserv(id, i);
              showRemovePopup.close()
            }
          }
        ]
      })
    }

    let interval;

    function showNotFoundPopup() {
      $scope.timerCounter = 10;
      interval = $interval(function () {
        if (!--$scope.timerCounter) {
          cancelInterval();
          showNotFound.close();
          $state.go('hotels');
        }
      }, 1000)
      let showNotFound = $ionicPopup.show({
        template: '<div>Вы будете перенаправлены на страницу выбора отеля через: {{timerCounter}}</div>',
        title: 'Активные бронирования не найдены!',
        subTitle: 'Перейти в раздел с выбором отеля?',
        scope: $scope,
        buttons: [
          {
            text: 'Отмена',
            type: 'button-assertive',
            onTap: function () {
              showNotFound.close();
              cancelInterval();
            }
          },
          {
            text: 'Ок',
            type: 'button-balanced',
            onTap: function () {
              $state.go('hotels');
            }
          }
        ]
      })
    }

    function cancelInterval() {
      interval && $interval.cancel(interval)
    }

    $scope.$on('$ionicView.beforeEnter', function () {
      $scope.isLoaded = false;
      httpService.getHotels()
        .then(function (data) {
          $scope.hotels = data;
          if (data.length) {
            findReservedHotels();
            $scope.errorMessage = undefined;
          } else {
            $scope.errorMessage = 'Отели не найдены'
          }
        })
        .catch(function (error) {
          $scope.errorMessage = error;
        })
        .finally(function () {
          $scope.isLoaded = true;
        })
    })

    $scope.$on('$ionicView.beforeLeave', cancelInterval);
  })
