angular.module('starter.directives', [])

    .directive('map', function () {
        return {
            template: '<div class="card" id="map" style="height: 300px"></div>',
            scope: {
                currentHotel: "="
            },
            replace: true,
            link: function (scope, element, attrs) {
                function init() {
                    let map = new ymaps.Map("map", {
                        center: scope.currentHotel.coordinates,
                        zoom: 16,
                        controls: ['miniMap'],
                    });
                    let hotelPlacemark = new ymaps.Placemark(
                        scope.currentHotel.coordinates,
                        {
                            balloonContent: scope.currentHotel.address
                        }
                    );
                    map.geoObjects.add(hotelPlacemark)
                }
                ymaps.ready(init);
            }
        }
    })