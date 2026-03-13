var wms_layers = [];


        var lyr_GoogleSatellite_0 = new ol.layer.Tile({
            'title': 'Google Satellite',
            'type':'base',
            'opacity': 1.000000,
            
            
            source: new ol.source.XYZ({
            attributions: ' ',
                url: 'https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}'
            })
        });
var format_JSONTangardona_1 = new ol.format.GeoJSON();
var features_JSONTangardona_1 = format_JSONTangardona_1.readFeatures(json_JSONTangardona_1, 
            {dataProjection: 'EPSG:4326', featureProjection: 'EPSG:3857'});
var jsonSource_JSONTangardona_1 = new ol.source.Vector({
    attributions: ' ',
});
jsonSource_JSONTangardona_1.addFeatures(features_JSONTangardona_1);
var lyr_JSONTangardona_1 = new ol.layer.Vector({
                declutter: false,
                source:jsonSource_JSONTangardona_1, 
                style: style_JSONTangardona_1,
                popuplayertitle: 'JSON Tangardona',
                interactive: true,
                title: '<img src="styles/legend/JSONTangardona_1.png" /> JSON Tangardona'
            });

lyr_GoogleSatellite_0.setVisible(true);lyr_JSONTangardona_1.setVisible(true);
var layersList = [lyr_GoogleSatellite_0,lyr_JSONTangardona_1];
lyr_JSONTangardona_1.set('fieldAliases', {'V_Name': 'V_Name', 'DMV_Code': 'DMV_Code', 'Parcel_num': 'Parcel_num', 'Sy.No.': 'Sy.No.', 'Katha No.': 'Katha No.', 'Pattadar Name': 'Pattadar Name', 'Extent': 'Extent', });
lyr_JSONTangardona_1.set('fieldImages', {'V_Name': 'TextEdit', 'DMV_Code': 'TextEdit', 'Parcel_num': 'TextEdit', 'Sy.No.': 'TextEdit', 'Katha No.': 'TextEdit', 'Pattadar Name': 'TextEdit', 'Extent': 'TextEdit', });
lyr_JSONTangardona_1.set('fieldLabels', {'V_Name': 'inline label - visible with data', 'DMV_Code': 'inline label - visible with data', 'Parcel_num': 'inline label - visible with data', 'Sy.No.': 'inline label - visible with data', 'Katha No.': 'inline label - visible with data', 'Pattadar Name': 'inline label - visible with data', 'Extent': 'inline label - visible with data', });
lyr_JSONTangardona_1.on('precompose', function(evt) {
    evt.context.globalCompositeOperation = 'normal';
});